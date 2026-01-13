/**
 * Topaz SDK Integration (Native SDK Fallback)
 * For systems where SigWeb is not available but the native SDK is installed
 * 
 * This module provides a fallback using the Topaz SDK through:
 * 1. ActiveX/COM (Internet Explorer - legacy)
 * 2. NPAPI Plugin (legacy browsers)
 * 3. WebSocket Bridge (modern approach if a bridge server is running)
 * 
 * For the T-LBK755-BHSB-R signature pad
 */

const SDK_CONFIG = {
  // WebSocket bridge configuration (if using a local bridge server)
  bridgePort: 8765,
  bridgeHost: 'localhost',
  
  // Signature image dimensions
  imageWidth: 500,
  imageHeight: 150,
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 500
};

// SDK connection state
let sdkConnection = {
  isConnected: false,
  connectionType: null, // 'websocket', 'activex', 'npapi'
  socket: null,
  activeXControl: null
};

// Pending promises for WebSocket responses
const pendingRequests = new Map();
let requestId = 0;

/**
 * Check if ActiveX is available (IE only - legacy support)
 */
function checkActiveX() {
  try {
    if (typeof window !== 'undefined' && window.ActiveXObject) {
      const control = new window.ActiveXObject('TOPAZ.SigPlusX');
      if (control) {
        sdkConnection.activeXControl = control;
        return true;
      }
    }
  } catch {
    // ActiveX not available
  }
  return false;
}

/**
 * Check if WebSocket bridge is available
 * @returns {Promise<boolean>}
 */
async function checkWebSocketBridge() {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`ws://${SDK_CONFIG.bridgeHost}:${SDK_CONFIG.bridgePort}`);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 2000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        sdkConnection.socket = ws;
        setupWebSocketHandlers(ws);
        resolve(true);
      };
      
      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

/**
 * Set up WebSocket message handlers
 */
function setupWebSocketHandlers(ws) {
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.id && pendingRequests.has(data.id)) {
        const { resolve, reject } = pendingRequests.get(data.id);
        pendingRequests.delete(data.id);
        
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data.result);
        }
      }
    } catch {
      console.error('Error parsing WebSocket message');
    }
  };
  
  ws.onclose = () => {
    sdkConnection.isConnected = false;
    sdkConnection.socket = null;
    // Reject all pending requests
    pendingRequests.forEach(({ reject }) => {
      reject(new Error('WebSocket connection closed'));
    });
    pendingRequests.clear();
  };
}

/**
 * Send a command through WebSocket bridge
 */
function sendBridgeCommand(command, params = {}) {
  return new Promise((resolve, reject) => {
    if (!sdkConnection.socket || sdkConnection.socket.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket not connected'));
      return;
    }
    
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });
    
    // Set timeout for response
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }
    }, 5000);
    
    sdkConnection.socket.send(JSON.stringify({
      id,
      command,
      params
    }));
  });
}

/**
 * Execute SDK command based on connection type
 */
async function executeSDKCommand(command, params = {}) {
  if (sdkConnection.connectionType === 'websocket') {
    return await sendBridgeCommand(command, params);
  } else if (sdkConnection.connectionType === 'activex' && sdkConnection.activeXControl) {
    return executeActiveXCommand(command, params);
  }
  throw new Error('No SDK connection available');
}

/**
 * Execute command through ActiveX control
 */
function executeActiveXCommand(command, params) {
  const ctrl = sdkConnection.activeXControl;
  
  switch (command) {
    case 'getTabletState':
      return ctrl.TabletState();
    case 'clearTablet':
      ctrl.ClearTablet();
      return true;
    case 'getNumPoints':
      return ctrl.NumberOfTabletPoints();
    case 'getSignatureImage':
      ctrl.SetImageXSize(params.width || SDK_CONFIG.imageWidth);
      ctrl.SetImageYSize(params.height || SDK_CONFIG.imageHeight);
      return ctrl.GetSigImageB64(1); // 1 = PNG
    case 'getSignatureString':
      return ctrl.GetSigString();
    case 'setLCDText':
      ctrl.LCDWriteString(1, 2, params.x || 0, params.y || 0, params.font || 2, params.text || '');
      return true;
    case 'clearLCD':
      ctrl.LCDRefresh(1, 0, 0, 240, 64);
      return true;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

/**
 * Check SDK availability and establish connection
 * @returns {Promise<{available: boolean, type: string}>}
 */
export async function checkSDKAvailability() {
  // Try WebSocket bridge first (modern approach)
  if (await checkWebSocketBridge()) {
    sdkConnection.isConnected = true;
    sdkConnection.connectionType = 'websocket';
    return { available: true, type: 'websocket' };
  }
  
  // Try ActiveX (legacy IE support)
  if (checkActiveX()) {
    sdkConnection.isConnected = true;
    sdkConnection.connectionType = 'activex';
    return { available: true, type: 'activex' };
  }
  
  return { available: false, type: null };
}

/**
 * Get tablet connection state
 */
export async function getTabletState() {
  try {
    const state = await executeSDKCommand('getTabletState');
    return parseInt(state, 10);
  } catch {
    return 0;
  }
}

/**
 * Clear the signature tablet
 */
export async function clearTablet() {
  await executeSDKCommand('clearTablet');
}

/**
 * Get number of signature points
 */
export async function getNumberOfPoints() {
  try {
    const count = await executeSDKCommand('getNumPoints');
    return parseInt(count, 10);
  } catch {
    return 0;
  }
}

/**
 * Check if there is a signature
 */
export async function hasSignature() {
  const points = await getNumberOfPoints();
  return points > 0;
}

/**
 * Get signature string (raw data)
 */
export async function getSignatureString() {
  return await executeSDKCommand('getSignatureString');
}

/**
 * Convert signature to SVG path with proper scaling
 * @param {number} targetWidth - Target width for SVG scaling
 * @param {number} targetHeight - Target height for SVG scaling
 */
export async function getSignatureAsSVGPath(targetWidth = 400, targetHeight = 120) {
  const sigString = await getSignatureString();
  if (!sigString) return '';
  
  return convertSignatureToSVGPath(sigString, targetWidth, targetHeight);
}

/**
 * Convert raw signature data to SVG path with scaling
 * @param {string} sigString - Raw signature string
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 */
function convertSignatureToSVGPath(sigString, targetWidth = 400, targetHeight = 120) {
  if (!sigString) return '';
  
  try {
    const values = sigString.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    
    if (values.length < 4) return '';
    
    // Find bounds for scaling
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let i = 0; i < values.length - 1; i += 2) {
      const x = values[i];
      const y = values[i + 1];
      if (x !== 0 || y !== 0) {
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
    
    const offsetX = padding + (targetWidth - padding * 2 - srcWidth * scale) / 2;
    const offsetY = padding + (targetHeight - padding * 2 - srcHeight * scale) / 2;
    
    const paths = [];
    let currentPath = '';
    let isFirstPoint = true;
    
    for (let i = 0; i < values.length - 1; i += 2) {
      const rawX = values[i];
      const rawY = values[i + 1];
      
      if (rawX === 0 && rawY === 0) {
        if (currentPath) {
          paths.push(currentPath);
          currentPath = '';
          isFirstPoint = true;
        }
        continue;
      }
      
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
 * Display text on LCD (for pads with displays)
 */
export async function displayText(text, x = 0, y = 0, font = 2) {
  await executeSDKCommand('setLCDText', { text, x, y, font });
}

/**
 * Clear LCD display
 */
export async function clearLCD() {
  await executeSDKCommand('clearLCD');
}

/**
 * Start signature capture session
 */
export async function startCapture(displayMessage = 'Please sign here') {
  await clearTablet();
  try {
    await clearLCD();
    await displayText(displayMessage, 10, 5);
  } catch {
    // LCD commands may fail on non-LCD pads
  }
}

/**
 * Stop capture and get result as SVG path
 * @param {number} targetWidth - Target width for SVG scaling
 * @param {number} targetHeight - Target height for SVG scaling
 */
export async function stopCapture(targetWidth = 400, targetHeight = 120) {
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
 * Disconnect from SDK
 */
export function disconnect() {
  if (sdkConnection.socket) {
    sdkConnection.socket.close();
    sdkConnection.socket = null;
  }
  sdkConnection.isConnected = false;
  sdkConnection.connectionType = null;
  sdkConnection.activeXControl = null;
}

/**
 * Create a signature capture controller
 */
export function createCaptureController(options = {}) {
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
      const points = await getNumberOfPoints();
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
      await startCapture(displayMessage);
      startPolling();
    },
    
    async stop() {
      stopPolling();
      return await stopCapture(targetWidth, targetHeight);
    },
    
    async clear() {
      await clearTablet();
      lastPointCount = 0;
      if (onPointsChange) {
        onPointsChange(0);
      }
    },
    
    async getPointCount() {
      return await getNumberOfPoints();
    },
    
    async getSVGPath() {
      return await getSignatureAsSVGPath(targetWidth, targetHeight);
    }
  };
}

export default {
  checkSDKAvailability,
  getTabletState,
  clearTablet,
  getNumberOfPoints,
  hasSignature,
  getSignatureString,
  getSignatureAsSVGPath,
  displayText,
  clearLCD,
  startCapture,
  stopCapture,
  disconnect,
  createCaptureController
};
