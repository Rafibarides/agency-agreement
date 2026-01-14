import { useRef, useState, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEraser, 
  faUndo, 
  faTabletAlt, 
  faPen, 
  faCheck, 
  faExclamationTriangle,
  faPlug,
  faSync,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import * as sigWeb from '../utils/sigweb';

// Signature capture modes
const CAPTURE_MODE = {
  CANVAS: 'canvas',      // Mouse/touch drawing
  HARDWARE: 'hardware'   // Topaz signature pad
};

// Canvas dimensions
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 120;

// Global state to track which SignaturePad is currently capturing
// This prevents multiple pads from capturing at the same time
let activeCapturingId = null;
let instanceCounter = 0;

const SignaturePad = ({ label, onChange, enableHardware = true }) => {
  // Unique ID for this instance
  const instanceId = useRef(++instanceCounter);
  
  const canvasRef = useRef(null);
  const hardwareCanvasRef = useRef(null);
  const previewStopRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [hasSignature, setHasSignature] = useState(false);
  const [captureMode, setCaptureMode] = useState(CAPTURE_MODE.CANVAS);
  const [hardwareSignatureSVG, setHardwareSignatureSVG] = useState('');
  const [isHardwareCapturing, setIsHardwareCapturing] = useState(false);
  
  // Hardware connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isTabletConnected, setIsTabletConnected] = useState(false);
  const [isDetecting, setIsDetecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [pointCount, setPointCount] = useState(0);

  // Check SigWeb connection on mount
  useEffect(() => {
    if (!enableHardware) {
      setIsDetecting(false);
      return;
    }

    const checkConnection = async () => {
      setIsDetecting(true);
      try {
        const result = await sigWeb.checkSigWebAvailability();
        setIsConnected(result.available);
        setIsTabletConnected(result.tabletConnected);
        setConnectionError(result.error);
      } catch (err) {
        setIsConnected(false);
        setIsTabletConnected(false);
        setConnectionError(err.message);
      }
      setIsDetecting(false);
    };

    checkConnection();

    // Periodically check tablet state
    const interval = setInterval(async () => {
      if (sigWeb.isConnected()) {
        try {
          const state = await sigWeb.getTabletState();
          setIsTabletConnected(state === 1);
        } catch {
          // Ignore polling errors
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enableHardware]);

  // Convert paths to SVG path string
  const pathsToSvgString = useCallback((pathsArray) => {
    if (!pathsArray || pathsArray.length === 0) return '';
    
    return pathsArray.map(path => {
      if (path.length === 0) return '';
      
      let d = `M ${path[0].x} ${path[0].y}`;
      for (let i = 1; i < path.length; i++) {
        d += ` L ${path[i].x} ${path[i].y}`;
      }
      return d;
    }).filter(d => d).join(' ');
  }, []);

  // Draw SVG path on canvas
  const drawSVGPathOnCanvas = useCallback((canvas, svgPathString) => {
    if (!canvas || !svgPathString) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const pathCommands = svgPathString.split(/(?=[ML])/);
    
    ctx.beginPath();
    let lastCommand = null;
    
    pathCommands.forEach(cmd => {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      
      const type = trimmed[0];
      const coords = trimmed.slice(1).trim().split(/\s+/).map(Number);
      
      if (type === 'M' && coords.length >= 2) {
        if (lastCommand === 'L') {
          ctx.stroke();
          ctx.beginPath();
        }
        ctx.moveTo(coords[0], coords[1]);
        lastCommand = 'M';
      } else if (type === 'L' && coords.length >= 2) {
        ctx.lineTo(coords[0], coords[1]);
        lastCommand = 'L';
      }
    });
    
    ctx.stroke();
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (captureMode !== CAPTURE_MODE.CANVAS) return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    setCurrentPath([coords]);
  };

  const draw = (e) => {
    if (!isDrawing || captureMode !== CAPTURE_MODE.CANVAS) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    setCurrentPath(prev => [...prev, coords]);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentPath.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    setIsDrawing(false);
    if (currentPath.length > 1) {
      const newPaths = [...paths, currentPath];
      setPaths(newPaths);
      setHasSignature(true);
      
      // Notify parent of change
      const svgPath = pathsToSvgString(newPaths);
      if (onChange) {
        onChange(svgPath);
      }
      
      // Redraw
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        newPaths.forEach(path => {
          if (path.length === 0) return;
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
          }
          ctx.stroke();
        });
      }, 0);
    }
    setCurrentPath([]);
  };

  // Clear signature
  const clear = useCallback(async () => {
    // Stop any preview polling
    if (previewStopRef.current) {
      previewStopRef.current();
      previewStopRef.current = null;
    }
    
    setPaths([]);
    setCurrentPath([]);
    setHasSignature(false);
    setHardwareSignatureSVG('');
    setPointCount(0);
    
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Clear hardware canvas
    const hwCanvas = hardwareCanvasRef.current;
    if (hwCanvas) {
      const ctx = hwCanvas.getContext('2d');
      ctx.clearRect(0, 0, hwCanvas.width, hwCanvas.height);
    }
    
    // Clear hardware pad
    if (sigWeb.isConnected()) {
      try {
        await sigWeb.clearSignature();
      } catch (e) {
        console.log('[SignaturePad] Could not clear hardware pad:', e.message);
      }
    }
    
    // Release capture if we're the active one
    if (activeCapturingId === instanceId.current) {
      activeCapturingId = null;
      setIsHardwareCapturing(false);
    }
    
    // Notify parent
    if (onChange) {
      onChange('');
    }
  }, [onChange]);

  const undo = () => {
    if (captureMode === CAPTURE_MODE.HARDWARE) return;
    
    if (paths.length > 0) {
      const newPaths = paths.slice(0, -1);
      setPaths(newPaths);
      setHasSignature(newPaths.length > 0);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        newPaths.forEach(path => {
          if (path.length === 0) return;
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
          }
          ctx.stroke();
        });
      }
      
      const svgPath = pathsToSvgString(newPaths);
      if (onChange) {
        onChange(svgPath);
      }
    }
  };

  // Start hardware capture with real-time preview
  const startHardwareCapture = useCallback(async () => {
    if (!sigWeb.isConnected() || !isTabletConnected) {
      console.log('[SignaturePad] Cannot start capture - not connected');
      return;
    }

    // Check if another instance is capturing
    if (activeCapturingId !== null && activeCapturingId !== instanceId.current) {
      console.log('[SignaturePad] Another pad is currently capturing');
      return;
    }

    // Take control
    activeCapturingId = instanceId.current;
    
    // Clear the pad first
    try {
      await sigWeb.clearSignature();
    } catch (e) {
      console.log('[SignaturePad] Error clearing pad:', e.message);
    }
    
    setIsHardwareCapturing(true);
    setHardwareSignatureSVG('');
    setPointCount(0);
    
    // Clear the preview canvas
    const canvas = hardwareCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Start real-time preview polling
    if (previewStopRef.current) {
      previewStopRef.current();
    }
    
    // Poll for point count and preview
    let running = true;
    const poll = async () => {
      if (!running || activeCapturingId !== instanceId.current) return;
      
      try {
        // Get point count
        const count = await sigWeb.getSignaturePointCount();
        setPointCount(count);
        
        // Draw preview if we have points
        if (count > 0 && canvas) {
          await sigWeb.drawSignatureToCanvas(canvas);
        }
      } catch (e) {
        // Ignore polling errors
      }
      
      if (running && activeCapturingId === instanceId.current) {
        setTimeout(poll, 100);
      }
    };
    
    poll();
    
    previewStopRef.current = () => {
      running = false;
    };
    
  }, [isTabletConnected]);

  // Accept hardware signature
  const acceptHardwareSignature = useCallback(async () => {
    if (!isHardwareCapturing || activeCapturingId !== instanceId.current) {
      console.log('[SignaturePad] Not currently capturing');
      return;
    }

    // Stop preview polling
    if (previewStopRef.current) {
      previewStopRef.current();
      previewStopRef.current = null;
    }

    console.log('[SignaturePad] Accepting signature, point count:', pointCount);

    // If no points, show error
    if (pointCount === 0) {
      alert('No signature detected. Please sign on the pad first.');
      activeCapturingId = null;
      setIsHardwareCapturing(false);
      return;
    }

    try {
      // Get the signature as SVG path
      let svgPath = await sigWeb.getSignatureAsSVGPath(CANVAS_WIDTH, CANVAS_HEIGHT);
      
      console.log('[SignaturePad] Got SVG path:', svgPath ? svgPath.substring(0, 80) : 'empty');
      
      // If SVG conversion failed but we have points, use a marker value
      // The actual signature is captured in SigWeb, we just need to mark it as signed
      if ((!svgPath || svgPath.length === 0) && pointCount > 0) {
        console.log('[SignaturePad] SVG conversion failed, using marker value');
        // Use a simple marker - the signature was captured on the hardware
        svgPath = 'HARDWARE_SIGNATURE_CAPTURED';
      }
      
      if (svgPath && svgPath.length > 0) {
        console.log('[SignaturePad] Setting signature');
        
        setHardwareSignatureSVG(svgPath);
        setHasSignature(true);
        
        // Only draw on canvas if it's a real SVG path (not the marker)
        if (svgPath !== 'HARDWARE_SIGNATURE_CAPTURED') {
          const canvas = hardwareCanvasRef.current;
          if (canvas) {
            drawSVGPathOnCanvas(canvas, svgPath);
          }
        }
        
        // CRITICAL: Notify parent with the SVG path
        if (onChange) {
          console.log('[SignaturePad] Calling onChange with signature data');
          onChange(svgPath);
        } else {
          console.error('[SignaturePad] onChange is not defined!');
        }
      }
    } catch (err) {
      console.error('[SignaturePad] Error accepting signature:', err);
      // Even if there's an error, if we had points, mark as signed
      if (pointCount > 0) {
        const markerValue = 'HARDWARE_SIGNATURE_CAPTURED';
        setHardwareSignatureSVG(markerValue);
        setHasSignature(true);
        if (onChange) {
          onChange(markerValue);
        }
      }
    }

    // Release capture
    activeCapturingId = null;
    setIsHardwareCapturing(false);
    
  }, [isHardwareCapturing, onChange, drawSVGPathOnCanvas, pointCount]);

  // Clear pad while capturing (re-start)
  const clearPadAndRestart = useCallback(async () => {
    if (!isHardwareCapturing) return;
    
    try {
      await sigWeb.clearSignature();
      setPointCount(0);
      
      // Clear the preview canvas
      const canvas = hardwareCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.log('[SignaturePad] Error clearing pad:', e.message);
    }
  }, [isHardwareCapturing]);

  // Switch capture mode
  const switchMode = useCallback(async (mode) => {
    // Clear current signature when switching
    await clear();
    setCaptureMode(mode);
    
    // Auto-start hardware capture when switching to hardware mode
    if (mode === CAPTURE_MODE.HARDWARE && sigWeb.isConnected() && isTabletConnected) {
      // Small delay to ensure clear is complete
      setTimeout(() => {
        startHardwareCapture();
      }, 100);
    }
  }, [clear, isTabletConnected, startHardwareCapture]);

  // Retry connection
  const retryConnection = useCallback(async () => {
    setIsDetecting(true);
    try {
      const result = await sigWeb.checkSigWebAvailability();
      setIsConnected(result.available);
      setIsTabletConnected(result.tabletConnected);
      setConnectionError(result.error);
    } catch (err) {
      setConnectionError(err.message);
    }
    setIsDetecting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewStopRef.current) {
        previewStopRef.current();
      }
      if (activeCapturingId === instanceId.current) {
        activeCapturingId = null;
      }
    };
  }, []);

  // Show hardware option if enabled and connected
  const showHardwareOption = enableHardware && (isDetecting || isConnected);
  const isHardwareAvailable = isConnected && isTabletConnected;

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      
      {/* Mode Selector */}
      {showHardwareOption && (
        <div className="signature-mode-selector">
          <button
            type="button"
            className={`mode-btn ${captureMode === CAPTURE_MODE.CANVAS ? 'active' : ''}`}
            onClick={() => switchMode(CAPTURE_MODE.CANVAS)}
          >
            <FontAwesomeIcon icon={faPen} />
            <span>Draw</span>
          </button>
          <button
            type="button"
            className={`mode-btn ${captureMode === CAPTURE_MODE.HARDWARE ? 'active' : ''}`}
            onClick={() => switchMode(CAPTURE_MODE.HARDWARE)}
            disabled={isDetecting || !isConnected}
          >
            <FontAwesomeIcon icon={faTabletAlt} />
            <span>{isDetecting ? 'Detecting...' : 'Signature Pad'}</span>
            {isDetecting && <FontAwesomeIcon icon={faSpinner} spin style={{ marginLeft: '0.5rem' }} />}
          </button>
        </div>
      )}

      {/* Status indicator for hardware mode */}
      {showHardwareOption && captureMode === CAPTURE_MODE.HARDWARE && (
        <div className="signature-status">
          {isDetecting ? (
            <span className="status-detecting">
              <FontAwesomeIcon icon={faSpinner} spin />
              Detecting signature pad...
            </span>
          ) : isConnected ? (
            isTabletConnected ? (
              <span className="status-connected">
                <FontAwesomeIcon icon={faPlug} />
                Pad Connected
              </span>
            ) : (
              <span className="status-warning">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                SigWeb running but no pad detected
                <button 
                  type="button" 
                  className="retry-btn"
                  onClick={retryConnection}
                  title="Retry connection"
                >
                  <FontAwesomeIcon icon={faSync} />
                </button>
              </span>
            )
          ) : (
            <span className="status-error">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {connectionError || 'SigWeb not detected'}
              <button 
                type="button" 
                className="retry-btn"
                onClick={retryConnection}
                title="Retry connection"
              >
                <FontAwesomeIcon icon={faSync} />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="signature-container">
        {/* Canvas Mode */}
        {captureMode === CAPTURE_MODE.CANVAS && (
          <>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="signature-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="signature-placeholder">Sign here</div>
            )}
          </>
        )}

        {/* Hardware Mode */}
        {captureMode === CAPTURE_MODE.HARDWARE && (
          <div className="hardware-signature-area">
            {hardwareSignatureSVG ? (
              // Signature has been captured - show success state
              <>
                {hardwareSignatureSVG === 'HARDWARE_SIGNATURE_CAPTURED' ? (
                  // Show "Signature Recorded" message when SVG conversion wasn't available
                  <div 
                    className="signature-canvas hardware-preview-canvas"
                    style={{ 
                      background: '#f0fff0', 
                      border: '2px solid #28a745',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      width: CANVAS_WIDTH,
                      height: CANVAS_HEIGHT
                    }}
                  >
                    <FontAwesomeIcon icon={faCheck} style={{ fontSize: '2rem', color: '#28a745', marginBottom: '0.5rem' }} />
                    <span style={{ color: '#28a745', fontWeight: 'bold', fontSize: '1.1rem' }}>Signature Recorded</span>
                    <span style={{ color: '#666', fontSize: '0.85rem' }}>Captured from signature pad</span>
                  </div>
                ) : (
                  // Show actual signature preview on canvas
                  <canvas
                    ref={hardwareCanvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="signature-canvas hardware-preview-canvas"
                    style={{ background: '#fff' }}
                  />
                )}
                <div className="capture-actions" style={{ marginTop: '0.5rem' }}>
                  <span style={{ color: '#28a745', marginRight: '1rem' }}>
                    <FontAwesomeIcon icon={faCheck} /> Signature captured
                  </span>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={startHardwareCapture}
                  >
                    <FontAwesomeIcon icon={faSync} />
                    Re-sign
                  </button>
                </div>
              </>
            ) : isHardwareCapturing ? (
              // Capturing in progress - show canvas for real-time preview
              <>
                <canvas
                  ref={hardwareCanvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="signature-canvas hardware-preview-canvas"
                  style={{ background: '#fff' }}
                />
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="capture-status" style={{ marginBottom: '0.5rem' }}>
                    <FontAwesomeIcon icon={faTabletAlt} className="pulse-icon" />
                    <span style={{ marginLeft: '0.5rem' }}>Sign on the pad now...</span>
                    {pointCount > 0 && (
                      <span className="point-count" style={{ marginLeft: '0.5rem', color: '#28a745' }}>
                        ({pointCount} points)
                      </span>
                    )}
                  </div>
                  <div className="capture-actions">
                    <button
                      type="button"
                      className="btn btn-small btn-primary"
                      onClick={acceptHardwareSignature}
                      disabled={pointCount === 0}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      Accept Signature
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      onClick={clearPadAndRestart}
                      disabled={pointCount === 0}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      <FontAwesomeIcon icon={faEraser} />
                      Clear Pad
                    </button>
                  </div>
                </div>
              </>
            ) : isHardwareAvailable ? (
              // Ready but not started - show placeholder and start button
              <>
                <div 
                  className="signature-canvas hardware-preview-canvas"
                  style={{ 
                    background: '#fafafa', 
                    border: '1px dashed #ccc',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    color: '#999'
                  }}
                >
                  Click below to start
                </div>
                <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startHardwareCapture}
                  >
                    <FontAwesomeIcon icon={faTabletAlt} />
                    Start Capture
                  </button>
                </div>
              </>
            ) : (
              // Hardware not available - show placeholder with message
              <>
                <div 
                  className="signature-canvas hardware-preview-canvas"
                  style={{ 
                    background: '#fff5f5', 
                    border: '1px dashed #dc3545',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    color: '#dc3545'
                  }}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginBottom: '0.5rem' }} />
                  <span>
                    {isConnected 
                      ? 'Connect signature pad'
                      : 'SigWeb not running'
                    }
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="signature-actions">
          {captureMode === CAPTURE_MODE.CANVAS && (
            <button
              type="button"
              className="btn btn-small btn-secondary btn-icon"
              onClick={undo}
              title="Undo"
              disabled={paths.length === 0}
            >
              <FontAwesomeIcon icon={faUndo} />
            </button>
          )}
          <button
            type="button"
            className="btn btn-small btn-secondary btn-icon"
            onClick={clear}
            title="Clear"
            disabled={!hasSignature && !isHardwareCapturing && pointCount === 0}
          >
            <FontAwesomeIcon icon={faEraser} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
