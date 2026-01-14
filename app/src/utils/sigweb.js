/**
 * SigWeb Integration for Topaz Signature Pads
 * Supports T-LBK755-BHSB-R and other Topaz signature capture devices
 * 
 * SigWeb runs as a local service on port 47289 (HTTPS) or 47290 (HTTP)
 * Requires SigWeb to be installed and running on the client machine
 * 
 * VERSION: 3.0 - Using tablet.sigwebtablet.com for HTTPS compatibility (2025-01-14)
 * 
 * KEY: Uses tablet.sigwebtablet.com domain which:
 * - Resolves to 127.0.0.1 (localhost)
 * - Has valid SSL certificate trusted by browsers
 * - Avoids mixed content issues when page is served over HTTPS
 */

// Log version on load to verify deployment
console.log('[SigWeb] Module loaded - Version 3.0 (tablet.sigwebtablet.com)');

const SIGWEB_CONFIG = {
  // SigWeb tablet domain - resolves to localhost but has valid SSL cert
  tabletDomain: 'tablet.sigwebtablet.com',
  
  // Default SigWeb service ports
  // When page is HTTPS: use port 47290 with https://tablet.sigwebtablet.com
  // When page is HTTP: use port 47289 with http://tablet.sigwebtablet.com
  httpsPort: 47290, // Used when page is HTTPS
  httpPort: 47289,  // Used when page is HTTP
  
  // Signature capture settings for T-LBK755-BHSB-R
  // This is a 4.4" x 1.3" active area pad with 410 PPI
  imageXSize: 500,
  imageYSize: 150,
  
  // Ink settings
  penWidth: 1,
  
  // LCD display settings for pads with screens
  lcdXSize: 240,
  lcdYSize: 64,
  
  // Connection timeout in ms
  timeout: 3000
};

// Track SigWeb connection state
let sigWebConnection = {
  isConnected: false,
  protocol: null,
  port: null,
  tabletModel: null,
  lastError: null
};

/**
 * Get the last connection error for debugging
 */
export function getLastConnectionError() {
  return sigWebConnection.lastError;
}

/**
 * Get the base URI for SigWeb based on page protocol
 * Uses tablet.sigwebtablet.com domain which resolves to localhost but has valid SSL cert
 */
function makeBaseUri() {
  const pageProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  
  // Use same protocol as page to avoid mixed content issues
  // tablet.sigwebtablet.com resolves to 127.0.0.1 but has valid SSL cert
  if (pageProtocol === 'https:') {
    // HTTPS page: use https with port 47290
    return `https://${SIGWEB_CONFIG.tabletDomain}:${SIGWEB_CONFIG.httpsPort}/SigWeb/`;
  } else {
    // HTTP page: use http with port 47289
    return `http://${SIGWEB_CONFIG.tabletDomain}:${SIGWEB_CONFIG.httpPort}/SigWeb/`;
  }
}

/**
 * Create an XMLHttpRequest (used by working Topaz code)
 */
function createXHR() {
  try { return new XMLHttpRequest(); } catch (e) { }
  try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch (e) { }
  try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch (e) { }
  try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch (e) { }
  try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch (e) { }
  return null;
}

/**
 * Make a synchronous SigWeb GET request (matches working Topaz implementation)
 */
function sigWebGetProperty(prop) {
  const baseUri = makeBaseUri();
  const xhr = createXHR();
  
  if (xhr) {
    try {
      xhr.open("GET", baseUri + prop, false); // Synchronous
      xhr.send(null);
      if (xhr.readyState === 4 && xhr.status === 200) {
        return xhr.responseText;
      }
    } catch (error) {
      console.log(`[SigWeb] XHR error for ${prop}:`, error.message);
    }
  }
  return "";
}

/**
 * Make a synchronous SigWeb POST request (matches working Topaz implementation)
 */
function sigWebSetPropertySync(prop) {
  const baseUri = makeBaseUri();
  const xhr = createXHR();
  
  if (xhr) {
    try {
      xhr.open("POST", baseUri + prop, false); // Synchronous
      xhr.send();
      if (xhr.readyState === 4 && xhr.status === 200) {
        return xhr.responseText;
      }
    } catch (error) {
      console.log(`[SigWeb] XHR error for ${prop}:`, error.message);
    }
  }
  return "";
}

/**
 * Create a fetch with timeout that works across browsers
 */
async function fetchWithTimeout(url, options = {}, timeout = SIGWEB_CONFIG.timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Test SigWeb endpoint using the tablet.sigwebtablet.com domain
 * @returns {Promise<{success: boolean, state: string, error: string|null}>}
 */
async function testEndpoint() {
  const baseUri = makeBaseUri();
  const url = baseUri + 'TabletState';
  
  console.log(`[SigWeb] Testing: ${url}`);
  
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    console.log(`[SigWeb] Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const state = await response.text();
      console.log(`[SigWeb] Response body: "${state.trim()}"`);
      return { success: true, state: state.trim(), error: null };
    } else {
      return { success: false, state: '', error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    // Provide detailed error info for debugging
    console.log(`[SigWeb] Fetch error:`, error.name, error.message);
    
    let errorMsg = error.message || 'Unknown error';
    
    if (error.name === 'AbortError') {
      errorMsg = 'Connection timeout - SigWeb may not be running';
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      errorMsg = 'Failed to connect - SigWeb may not be running or DNS issue with tablet.sigwebtablet.com';
    }
    
    return { success: false, state: '', error: errorMsg };
  }
}

/**
 * Check if SigWeb service is available
 * Uses tablet.sigwebtablet.com domain which resolves to localhost but has valid SSL cert
 * @returns {Promise<{available: boolean, protocol: string, port: number, tabletConnected: boolean, error: string|null}>}
 */
export async function checkSigWebAvailability() {
  const pageProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const baseUri = makeBaseUri();
  
  console.log('[SigWeb] ====== CONNECTION CHECK START ======');
  console.log('[SigWeb] Page protocol:', pageProtocol);
  console.log('[SigWeb] Using base URI:', baseUri);
  console.log('[SigWeb] (tablet.sigwebtablet.com resolves to 127.0.0.1 with valid SSL cert)');
  
  const result = await testEndpoint();
  
  if (result.success) {
    const protocol = pageProtocol === 'https:' ? 'https' : 'http';
    const port = pageProtocol === 'https:' ? SIGWEB_CONFIG.httpsPort : SIGWEB_CONFIG.httpPort;
    
    console.log(`[SigWeb] ✓ SUCCESS! Connected via ${protocol}://${SIGWEB_CONFIG.tabletDomain}:${port}`);
    console.log(`[SigWeb] Tablet state: ${result.state} (1=connected, 0=disconnected)`);
    
    sigWebConnection = {
      isConnected: true,
      protocol: protocol,
      port: port,
      tabletModel: null,
      lastError: null
    };
    
    return { 
      available: true, 
      protocol: protocol,
      port: port,
      tabletConnected: result.state === '1',
      error: null
    };
  }
  
  // Connection failed
  console.error('[SigWeb] ====== CONNECTION FAILED ======');
  console.error('[SigWeb] Error:', result.error);
  
  sigWebConnection = {
    isConnected: false,
    protocol: null,
    port: null,
    tabletModel: null,
    lastError: result.error
  };
  
  // Provide helpful error message
  let helpfulError = 'SigWeb not detected. Ensure SigWeb service is installed and running.';
  
  if (result.error && result.error.includes('timeout')) {
    helpfulError = 'Connection timeout. SigWeb service may not be running. Please ensure SigWeb is installed and the service is started.';
  } else if (result.error && result.error.includes('Failed to connect')) {
    helpfulError = 'Could not connect to SigWeb. Please verify: 1) SigWeb is installed, 2) The SigWeb service is running, 3) Your firewall allows connections on port ' + 
      (pageProtocol === 'https:' ? SIGWEB_CONFIG.httpsPort : SIGWEB_CONFIG.httpPort);
  }
  
  return { 
    available: false, 
    protocol: null, 
    port: null, 
    tabletConnected: false,
    error: helpfulError
  };
}

/**
 * Get the base URL for SigWeb API calls
 * Uses tablet.sigwebtablet.com domain (resolves to localhost with valid SSL cert)
 */
function getSigWebBaseUrl() {
  if (!sigWebConnection.isConnected) {
    throw new Error('SigWeb not connected. Call checkSigWebAvailability first.');
  }
  // Use the tablet domain instead of localhost for SSL compatibility
  return `${sigWebConnection.protocol}://${SIGWEB_CONFIG.tabletDomain}:${sigWebConnection.port}/SigWeb`;
}

/**
 * Check if currently connected to SigWeb
 */
export function isConnected() {
  return sigWebConnection.isConnected;
}

/**
 * Get current connection info
 */
export function getConnectionInfo() {
  return {
    isConnected: sigWebConnection.isConnected,
    protocol: sigWebConnection.protocol,
    port: sigWebConnection.port,
    lastError: sigWebConnection.lastError
  };
}

/**
 * Make a SigWeb API GET call (for reading data)
 */
async function sigWebGet(endpoint) {
  const baseUrl = getSigWebBaseUrl();
  const url = `${baseUrl}/${endpoint}`;
  
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SigWeb GET failed: ${response.status} ${response.statusText}`);
    }
    
    return response.text();
  } catch (error) {
    console.error(`[SigWeb] GET ${endpoint} failed:`, error.message);
    throw error;
  }
}

/**
 * Make a SigWeb API POST call (for setting/clearing data)
 */
async function sigWebPost(endpoint) {
  const baseUrl = getSigWebBaseUrl();
  const url = `${baseUrl}/${endpoint}`;
  
  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SigWeb POST failed: ${response.status} ${response.statusText}`);
    }
    
    return response.text();
  } catch (error) {
    console.error(`[SigWeb] POST ${endpoint} failed:`, error.message);
    throw error;
  }
}

/**
 * Get tablet state (0 = not connected, 1 = connected)
 */
export async function getTabletState() {
  try {
    const state = await sigWebGet('TabletState');
    return parseInt(state, 10);
  } catch {
    return 0;
  }
}

/**
 * Get the tablet model info
 */
export async function getTabletModelNumber() {
  try {
    const model = await sigWebGet('TabletModelNumber');
    sigWebConnection.tabletModel = model;
    return model;
  } catch {
    return null;
  }
}

/**
 * Check if the tablet has an LCD display (like T-LBK755)
 */
export async function hasLCDDisplay() {
  try {
    const result = await sigWebGet('CaptureMode');
    return result !== '-1' && result !== '0';
  } catch {
    return false;
  }
}

/**
 * Reset the tablet and clear any existing signature
 * Note: SigWeb doesn't have a "Reset" endpoint - use ResetParameters or ClearSignature
 */
export async function resetTablet() {
  try {
    // ResetParameters resets tablet settings to defaults
    await sigWebPost('ResetParameters');
  } catch {
    // If ResetParameters fails, just clear the signature
    await clearSignature();
  }
}

/**
 * Clear the signature from the tablet
 */
export async function clearSignature() {
  // Use ClearSignature endpoint (matches working Topaz code)
  await sigWebGet('ClearSignature');
}

/**
 * Set the LCD capture mode for pads with displays
 * Mode 2 = Capture in autoerase mode (recommended for T-LBK755)
 */
export async function setLCDCaptureMode(mode = 2) {
  await sigWebPost(`CaptureMode/${mode}`);
}

/**
 * Display text on the LCD screen (for pads with displays)
 * Note: This is complex - uses canvas rendering in reference implementation
 * For now, we'll skip LCD text display as it requires special handling
 */
export async function displayLCDText(text, x = 0, y = 0, font = 2) {
  // LCD text display requires special bitmap handling
  // The reference code creates a canvas, renders text, and sends as bitmap
  // For basic functionality, we can skip this
  console.log('[SigWeb] LCD text display not implemented - tablet will work without it');
}

/**
 * Clear the LCD display
 */
export async function clearLCD() {
  try {
    await sigWebPost('LcdRefresh/0,0,0,240,64');
  } catch {
    // LCD refresh may not be supported on all tablets
  }
}

/**
 * Set the signature window dimensions on LCD pads
 */
export async function setSigWindow(coords, x, y, width, height) {
  await sigWebPost(`SigWindow/${coords},${x},${y},${width},${height}`);
}

/**
 * Get the number of points in the current signature
 * @returns {Promise<number>}
 */
export async function getSignaturePointCount() {
  try {
    const count = await sigWebGet('TotalPoints');
    return parseInt(count, 10);
  } catch {
    return 0;
  }
}

/**
 * Set the image size for signature capture
 */
export async function setImageSize(width, height) {
  await sigWebPost(`ImageXSize/${width}`);
  await sigWebPost(`ImageYSize/${height}`);
}

/**
 * Get the current signature as an image blob (for real-time preview)
 * @param {HTMLCanvasElement} canvas - Canvas to draw on
 * @returns {Promise<boolean>} - True if image was drawn
 */
export async function drawSignatureToCanvas(canvas) {
  if (!sigWebConnection.isConnected || !canvas) return false;
  
  const baseUrl = getSigWebBaseUrl();
  const url = `${baseUrl}/SigImage/0`; // 0 = current image without finalizing
  
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.timeout = 1000;
    
    xhr.onload = function() {
      if (xhr.status === 200 && xhr.response) {
        const img = new Image();
        const blobUrl = URL.createObjectURL(xhr.response);
        
        img.onload = function() {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(blobUrl);
          resolve(true);
        };
        
        img.onerror = function() {
          URL.revokeObjectURL(blobUrl);
          resolve(false);
        };
        
        img.src = blobUrl;
      } else {
        resolve(false);
      }
    };
    
    xhr.onerror = function() {
      resolve(false);
    };
    
    xhr.ontimeout = function() {
      resolve(false);
    };
    
    xhr.send(null);
  });
}

/**
 * Start real-time signature preview polling
 * @param {HTMLCanvasElement} canvas - Canvas to draw on
 * @param {number} interval - Polling interval in ms (default 100)
 * @returns {function} - Stop function to call when done
 */
export function startSignaturePreview(canvas, interval = 100) {
  let running = true;
  
  const poll = async () => {
    if (!running) return;
    
    await drawSignatureToCanvas(canvas);
    
    if (running) {
      setTimeout(poll, interval);
    }
  };
  
  poll();
  
  return () => {
    running = false;
  };
}

/**
 * Check if there is a signature on the tablet
 * @returns {Promise<boolean>}
 */
export async function hasSignature() {
  const points = await getSignaturePointCount();
  return points > 0;
}

/**
 * Get raw signature point data from SigWeb
 * @returns {Promise<Array>} Array of point objects with x, y coordinates
 */
export async function getSignaturePoints() {
  const pointCount = await getSignaturePointCount();
  if (pointCount === 0) return [];
  
  try {
    // Get signature string and parse it
    const sigString = await sigWebGet('SigString');
    if (!sigString) return [];
    
    // Parse the signature string into points
    const cleanStr = sigString.replace(/^"|"$/g, ''); // Remove quotes if present
    const values = cleanStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    
    const points = [];
    for (let i = 0; i < values.length - 1; i += 2) {
      const x = values[i];
      const y = values[i + 1];
      points.push({
        x: x,
        y: y,
        pressure: 1,
        penUp: x === 0 && y === 0
      });
    }
    return points;
  } catch {
    return [];
  }
}

/**
 * Get signature as SVG path data (for integration with current system)
 * Converts raw point data to SVG path commands
 * @param {number} targetWidth - Target width for scaling (default 400 to match canvas)
 * @param {number} targetHeight - Target height for scaling (default 120 to match canvas)
 * @returns {Promise<string>} SVG path string
 */
export async function getSignatureAsSVGPath(targetWidth = 400, targetHeight = 120) {
  const pointCount = await getSignaturePointCount();
  console.log('[SigWeb] getSignatureAsSVGPath - point count:', pointCount);
  
  if (pointCount === 0) {
    console.log('[SigWeb] No points, returning empty string');
    return '';
  }
  
  try {
    // Get SigString (matches working Topaz code)
    const sigData = await sigWebGet('SigString');
    console.log('[SigWeb] Raw SigString response:', sigData ? sigData.substring(0, 100) : 'null');
    
    if (sigData && sigData.length > 2) {
      // SigWeb returns the string with quotes, like: "x1,y1,x2,y2,..."
      // We need to strip them - use slice(1, -1) like the reference code
      let cleanData = sigData;
      if (sigData.startsWith('"') && sigData.endsWith('"')) {
        cleanData = sigData.slice(1, -1);
      }
      // Also try regex approach as backup
      cleanData = cleanData.replace(/^"|"$/g, '');
      
      console.log('[SigWeb] Cleaned SigString:', cleanData.substring(0, 100));
      
      if (cleanData && cleanData.length > 0) {
        const svgPath = convertSigStringToSVGPath(cleanData, targetWidth, targetHeight);
        console.log('[SigWeb] Converted to SVG path:', svgPath ? svgPath.substring(0, 100) : 'empty');
        return svgPath;
      }
    }
    
    console.log('[SigWeb] SigString empty or invalid, trying fallback');
    // Fallback: get points individually
    const points = await getSignaturePoints();
    console.log('[SigWeb] Got points:', points.length);
    return convertPointsToSVGPath(points, targetWidth, targetHeight);
  } catch (error) {
    console.error('[SigWeb] Error getting signature as SVG:', error);
    return '';
  }
}

/**
 * Convert SigWeb's signature string to SVG path
 * @param {string} sigString - Raw signature data from SigWeb
 * @param {number} targetWidth - Target width for scaling
 * @param {number} targetHeight - Target height for scaling
 * @returns {string} SVG path data
 */
function convertSigStringToSVGPath(sigString, targetWidth = 400, targetHeight = 120) {
  if (!sigString) {
    console.log('[SigWeb] convertSigStringToSVGPath: empty input');
    return '';
  }
  
  try {
    // Parse the signature string - format is typically comma-separated values
    // with pen-up indicated by 0,0 coordinates
    const values = sigString.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    
    console.log('[SigWeb] convertSigStringToSVGPath: parsed', values.length, 'values');
    
    if (values.length < 4) {
      console.log('[SigWeb] convertSigStringToSVGPath: not enough values');
      return '';
    }
    
    // Find bounds for scaling
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let validPoints = 0;
    
    for (let i = 0; i < values.length - 1; i += 2) {
      const x = values[i];
      const y = values[i + 1];
      if (x !== 0 || y !== 0) { // Skip pen-up markers
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        validPoints++;
      }
    }
    
    console.log('[SigWeb] Bounds: validPoints=', validPoints, 'minX=', minX, 'maxX=', maxX, 'minY=', minY, 'maxY=', maxY);
    
    // If no valid points found, return empty
    if (validPoints === 0 || minX === Infinity) {
      console.log('[SigWeb] No valid points found');
      return '';
    }
    
    // Calculate scale factors with padding
    const padding = 10;
    const srcWidth = maxX - minX || 1;
    const srcHeight = maxY - minY || 1;
    const scaleX = (targetWidth - padding * 2) / srcWidth;
    const scaleY = (targetHeight - padding * 2) / srcHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Center offset
    const offsetX = padding + (targetWidth - padding * 2 - srcWidth * scale) / 2;
    const offsetY = padding + (targetHeight - padding * 2 - srcHeight * scale) / 2;
    
    // Build SVG path
    const paths = [];
    let currentPath = '';
    let isFirstPoint = true;
    
    for (let i = 0; i < values.length - 1; i += 2) {
      const rawX = values[i];
      const rawY = values[i + 1];
      
      // Pen-up indicator
      if (rawX === 0 && rawY === 0) {
        if (currentPath) {
          paths.push(currentPath);
          currentPath = '';
          isFirstPoint = true;
        }
        continue;
      }
      
      // Scale and translate
      const x = Math.round((rawX - minX) * scale + offsetX);
      const y = Math.round((rawY - minY) * scale + offsetY);
      
      if (isFirstPoint) {
        currentPath = `M ${x} ${y}`;
        isFirstPoint = false;
      } else {
        currentPath += ` L ${x} ${y}`;
      }
    }
    
    if (currentPath) {
      paths.push(currentPath);
    }
    
    const result = paths.join(' ');
    console.log('[SigWeb] convertSigStringToSVGPath: created', paths.length, 'path segments, total length:', result.length);
    return result;
  } catch (err) {
    console.error('[SigWeb] convertSigStringToSVGPath error:', err);
    return '';
  }
}

/**
 * Convert point array to SVG path
 * @param {Array} points - Array of point objects
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @returns {string} SVG path data
 */
function convertPointsToSVGPath(points, targetWidth = 400, targetHeight = 120) {
  if (!points || points.length === 0) return '';
  
  // Find bounds
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  points.forEach(p => {
    if (!p.penUp) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  });
  
  const padding = 10;
  const srcWidth = maxX - minX || 1;
  const srcHeight = maxY - minY || 1;
  const scaleX = (targetWidth - padding * 2) / srcWidth;
  const scaleY = (targetHeight - padding * 2) / srcHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const offsetX = padding + (targetWidth - padding * 2 - srcWidth * scale) / 2;
  const offsetY = padding + (targetHeight - padding * 2 - srcHeight * scale) / 2;
  
  const paths = [];
  let currentPath = '';
  let isFirstPoint = true;
  
  points.forEach(p => {
    if (p.penUp) {
      if (currentPath) {
        paths.push(currentPath);
        currentPath = '';
        isFirstPoint = true;
      }
      return;
    }
    
    const x = Math.round((p.x - minX) * scale + offsetX);
    const y = Math.round((p.y - minY) * scale + offsetY);
    
    if (isFirstPoint) {
      currentPath = `M ${x} ${y}`;
      isFirstPoint = false;
    } else {
      currentPath += ` L ${x} ${y}`;
    }
  });
  
  if (currentPath) {
    paths.push(currentPath);
  }
  
  return paths.join(' ');
}

/**
 * Start capturing a signature
 * Sets up the tablet for signature capture
 */
export async function startSignatureCapture(displayMessage = 'Please sign here') {
  // Clear any existing signature
  await clearSignature();
  
  // Check if pad has LCD and set it up
  try {
    const hasLCD = await hasLCDDisplay();
    if (hasLCD) {
      await setLCDCaptureMode(2);
      await clearLCD();
      // Note: LCD text display requires complex bitmap handling, skipping for now
    }
  } catch (e) {
    // LCD setup is optional, continue without it
    console.log('[SigWeb] LCD setup skipped:', e.message);
  }
}

/**
 * Stop signature capture and get the result as SVG path
 * @param {number} targetWidth - Target width for SVG scaling
 * @param {number} targetHeight - Target height for SVG scaling
 * @returns {Promise<{hasSignature: boolean, svgPath: string}>}
 */
export async function stopSignatureCapture(targetWidth = 400, targetHeight = 120) {
  const hasSig = await hasSignature();
  
  if (!hasSig) {
    return { hasSignature: false, svgPath: '' };
  }
  
  const svgPath = await getSignatureAsSVGPath(targetWidth, targetHeight);
  
  return {
    hasSignature: true,
    svgPath
  };
}

/**
 * Full signature capture workflow
 * @param {Object} options - Capture options
 * @param {Function} onPointsChange - Callback when points are added
 * @returns {Object} Control object with methods
 */
export function createSignatureCapture(options = {}) {
  const {
    displayMessage = 'Please sign here',
    pollInterval = 100,
    onPointsChange = null,
    targetWidth = 400,
    targetHeight = 120
  } = options;
  
  let pollTimer = null;
  let lastPointCount = 0;
  
  const startPolling = () => {
    pollTimer = setInterval(async () => {
      const points = await getSignaturePointCount();
      if (points !== lastPointCount) {
        lastPointCount = points;
        if (onPointsChange) {
          onPointsChange(points);
        }
      }
    }, pollInterval);
  };
  
  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
  
  return {
    async start() {
      await startSignatureCapture(displayMessage);
      startPolling();
    },
    
    async stop() {
      stopPolling();
      return await stopSignatureCapture(targetWidth, targetHeight);
    },
    
    async clear() {
      await clearSignature();
      lastPointCount = 0;
      if (onPointsChange) {
        onPointsChange(0);
      }
    },
    
    async getPointCount() {
      return await getSignaturePointCount();
    },
    
    async getSVGPath() {
      return await getSignatureAsSVGPath(targetWidth, targetHeight);
    }
  };
}

export default {
  checkSigWebAvailability,
  getTabletState,
  getTabletModelNumber,
  hasLCDDisplay,
  resetTablet,
  clearSignature,
  setLCDCaptureMode,
  displayLCDText,
  clearLCD,
  setSigWindow,
  getSignaturePointCount,
  setImageSize,
  drawSignatureToCanvas,
  startSignaturePreview,
  hasSignature,
  getSignaturePoints,
  getSignatureAsSVGPath,
  startSignatureCapture,
  stopSignatureCapture,
  createSignatureCapture,
  isConnected,
  getConnectionInfo,
  getLastConnectionError
};
