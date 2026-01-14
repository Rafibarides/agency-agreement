/**
 * SigWeb Integration for Topaz Signature Pads
 * Supports T-LBK755-BHSB-R and other Topaz signature capture devices
 * 
 * SigWeb runs as a local service on port 47289 (HTTPS) or 47290 (HTTP)
 * Requires SigWeb to be installed and running on the client machine
 * 
 * IMPORTANT: For HTTPS pages, the browser must first accept SigWeb's self-signed
 * certificate by visiting https://localhost:47289/SigWeb/TabletState directly.
 */

const SIGWEB_CONFIG = {
  // Default SigWeb service ports
  httpsPort: 47289,
  httpPort: 47290,
  
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
 * Test a single SigWeb endpoint
 * @returns {Promise<{success: boolean, state: string, error: string|null}>}
 */
async function testEndpoint(protocol, port) {
  const url = `${protocol}://localhost:${port}/SigWeb/TabletState`;
  
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    if (response.ok) {
      const state = await response.text();
      return { success: true, state: state.trim(), error: null };
    } else {
      return { success: false, state: '', error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    // Provide detailed error info for debugging
    let errorMsg = error.message || 'Unknown error';
    
    if (error.name === 'AbortError') {
      errorMsg = 'Connection timeout - SigWeb may not be running';
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      // This is usually CORS or network error
      if (protocol === 'https') {
        errorMsg = 'HTTPS connection failed - certificate may need to be accepted in browser';
      } else {
        errorMsg = 'Connection failed - CORS error or SigWeb not running';
      }
    }
    
    return { success: false, state: '', error: errorMsg };
  }
}

/**
 * Check if SigWeb service is available
 * Tries HTTPS first (required for HTTPS pages), then HTTP as fallback
 * @returns {Promise<{available: boolean, protocol: string, port: number, tabletConnected: boolean, error: string|null}>}
 */
export async function checkSigWebAvailability() {
  const isPageHTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const errors = [];
  
  // Determine endpoint order based on page protocol
  // For HTTPS pages, we MUST use HTTPS to SigWeb (mixed content blocking)
  // For HTTP pages, we can try both but HTTP is more reliable
  const endpoints = isPageHTTPS
    ? [
        { protocol: 'https', port: SIGWEB_CONFIG.httpsPort }
        // Note: HTTP won't work from HTTPS page due to mixed content
      ]
    : [
        { protocol: 'http', port: SIGWEB_CONFIG.httpPort },
        { protocol: 'https', port: SIGWEB_CONFIG.httpsPort }
      ];
  
  console.log('[SigWeb] Checking availability...', { isPageHTTPS, endpoints });
  
  for (const endpoint of endpoints) {
    console.log(`[SigWeb] Trying ${endpoint.protocol}://localhost:${endpoint.port}...`);
    
    const result = await testEndpoint(endpoint.protocol, endpoint.port);
    
    if (result.success) {
      console.log(`[SigWeb] Connected via ${endpoint.protocol}:${endpoint.port}, tablet state: ${result.state}`);
      
      sigWebConnection = {
        isConnected: true,
        protocol: endpoint.protocol,
        port: endpoint.port,
        tabletModel: null,
        lastError: null
      };
      
      return { 
        available: true, 
        protocol: endpoint.protocol,
        port: endpoint.port,
        tabletConnected: result.state === '1',
        error: null
      };
    } else {
      console.warn(`[SigWeb] ${endpoint.protocol}:${endpoint.port} failed:`, result.error);
      errors.push(`${endpoint.protocol}:${endpoint.port} - ${result.error}`);
    }
  }
  
  // All endpoints failed
  const combinedError = errors.join('; ');
  console.error('[SigWeb] All connection attempts failed:', combinedError);
  
  sigWebConnection = {
    isConnected: false,
    protocol: null,
    port: null,
    tabletModel: null,
    lastError: combinedError
  };
  
  // Provide helpful error message
  let helpfulError = combinedError;
  if (isPageHTTPS) {
    helpfulError = 'HTTPS certificate not accepted. Visit https://localhost:47289/SigWeb/TabletState in your browser and accept the certificate, then refresh this page.';
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
 */
function getSigWebBaseUrl() {
  if (!sigWebConnection.isConnected) {
    throw new Error('SigWeb not connected. Call checkSigWebAvailability first.');
  }
  return `${sigWebConnection.protocol}://localhost:${sigWebConnection.port}/SigWeb`;
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
 * Make a SigWeb API call
 */
async function sigWebCall(endpoint, params = {}) {
  const baseUrl = getSigWebBaseUrl();
  const url = new URL(`${baseUrl}/${endpoint}`);
  
  Object.keys(params).forEach(key => {
    url.searchParams.append(key, params[key]);
  });
  
  try {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SigWeb call failed: ${response.status} ${response.statusText}`);
    }
    
    return response.text();
  } catch (error) {
    console.error(`[SigWeb] API call to ${endpoint} failed:`, error.message);
    throw error;
  }
}

/**
 * Get tablet state (0 = not connected, 1 = connected)
 */
export async function getTabletState() {
  try {
    const state = await sigWebCall('TabletState');
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
    const model = await sigWebCall('TabletModelNumber');
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
    const result = await sigWebCall('GetLCDCaptureMode');
    return result !== '-1' && result !== '0';
  } catch {
    return false;
  }
}

/**
 * Reset the tablet and clear any existing signature
 */
export async function resetTablet() {
  await sigWebCall('Reset');
}

/**
 * Clear the signature from the tablet
 */
export async function clearSignature() {
  await sigWebCall('ClearTablet');
}

/**
 * Set the LCD capture mode for pads with displays
 * Mode 2 = Capture in autoerase mode (recommended for T-LBK755)
 */
export async function setLCDCaptureMode(mode = 2) {
  await sigWebCall('SetLCDCaptureMode', { Mode: mode });
}

/**
 * Display text on the LCD screen (for pads with displays)
 * @param {string} text - Text to display
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} font - Font size (1-5)
 */
export async function displayLCDText(text, x = 0, y = 0, font = 2) {
  await sigWebCall('LCDWriteString', {
    Dest: 1, // 1 = LCD, 2 = Background
    Mode: 1, // 1 = Normal
    X: x,
    Y: y,
    Font: font,
    String: text
  });
}

/**
 * Clear the LCD display
 */
export async function clearLCD() {
  await sigWebCall('ClearSigWindow', { Dest: 1 });
}

/**
 * Set the signature window dimensions on LCD pads
 */
export async function setSigWindow(x = 0, y = 0, width = 240, height = 64) {
  await sigWebCall('SetSigWindow', { 
    Coords: `${x},${y},${x + width},${y + height}` 
  });
}

/**
 * Get the number of points in the current signature
 * @returns {Promise<number>}
 */
export async function getSignaturePointCount() {
  try {
    const count = await sigWebCall('GetNumPoints');
    return parseInt(count, 10);
  } catch {
    return 0;
  }
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
    // Get all points - SigWeb provides GetSigPoint for individual points
    const points = [];
    for (let i = 0; i < pointCount; i++) {
      const pointData = await sigWebCall('GetSigPoint', { Index: i });
      if (pointData) {
        // Point format: "x,y,pressure" or "x,y"
        const parts = pointData.split(',').map(Number);
        points.push({
          x: parts[0],
          y: parts[1],
          pressure: parts[2] || 1,
          // Pen up is indicated by 0 pressure or special values
          penUp: parts[2] === 0 || parts[0] === 0
        });
      }
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
  if (pointCount === 0) return '';
  
  try {
    // Try GetSigString first (more reliable for point data)
    const sigData = await sigWebCall('GetSigString');
    
    if (sigData && sigData !== '') {
      return convertSigStringToSVGPath(sigData, targetWidth, targetHeight);
    }
    
    // Fallback: get points individually
    const points = await getSignaturePoints();
    return convertPointsToSVGPath(points, targetWidth, targetHeight);
  } catch (error) {
    console.error('Error getting signature as SVG:', error);
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
  if (!sigString) return '';
  
  try {
    // Parse the signature string - format is typically comma-separated values
    // with pen-up indicated by 0,0 coordinates
    const values = sigString.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    
    if (values.length < 4) return '';
    
    // Find bounds for scaling
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let i = 0; i < values.length - 1; i += 2) {
      const x = values[i];
      const y = values[i + 1];
      if (x !== 0 || y !== 0) { // Skip pen-up markers
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
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
    
    return paths.join(' ');
  } catch {
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
  await resetTablet();
  
  // Check if pad has LCD and set it up
  const hasLCD = await hasLCDDisplay();
  if (hasLCD) {
    await setLCDCaptureMode(2);
    await clearLCD();
    await displayLCDText(displayMessage, 10, 5, 2);
    await setSigWindow(0, 20, SIGWEB_CONFIG.lcdXSize, SIGWEB_CONFIG.lcdYSize - 20);
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
