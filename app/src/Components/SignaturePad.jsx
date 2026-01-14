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
import { useTopazSignature, CONNECTION_TYPE } from '../hooks/useTopazSignature';

// Signature capture modes
const CAPTURE_MODE = {
  CANVAS: 'canvas',      // Mouse/touch drawing
  HARDWARE: 'hardware'   // Topaz signature pad
};

// Canvas dimensions (matches original)
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 120;

const SignaturePad = ({ label, onChange, enableHardware = true }) => {
  const canvasRef = useRef(null);
  const hardwareCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [hasSignature, setHasSignature] = useState(false);
  const [captureMode, setCaptureMode] = useState(CAPTURE_MODE.CANVAS);
  const [hardwareSignatureSVG, setHardwareSignatureSVG] = useState('');
  const [isHardwareCapturing, setIsHardwareCapturing] = useState(false);

  // Topaz signature pad hook
  const topaz = useTopazSignature({
    autoConnect: enableHardware,
    displayMessage: label || 'Please sign here'
  });

  // Draw SVG path string onto a canvas
  const drawSVGPathOnCanvas = useCallback((canvas, svgPathString) => {
    if (!canvas || !svgPathString) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Parse SVG path commands
    const pathCommands = svgPathString.split(/(?=[ML])/);
    
    ctx.beginPath();
    let lastCommand = null;
    
    pathCommands.forEach(cmd => {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      
      const type = trimmed[0];
      const coords = trimmed.slice(1).trim().split(/\s+/).map(Number);
      
      if (type === 'M' && coords.length >= 2) {
        // If we had a previous path segment, stroke it
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

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    paths.forEach(path => {
      if (path.length === 0) return;
      
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    });
  }, [paths]);

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
    
    // Draw live stroke
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
      if (onChange) {
        const svgPath = pathsToSvgString(newPaths);
        onChange(svgPath);
      }
      
      // Redraw with new paths
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

  const clear = useCallback(async () => {
    setPaths([]);
    setCurrentPath([]);
    setHasSignature(false);
    setHardwareSignatureSVG('');
    setIsHardwareCapturing(false);
    
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
    
    // Clear hardware pad if connected
    if (topaz.isConnected) {
      try {
        await topaz.clearSignature();
      } catch (e) {
        console.log('[SignaturePad] Could not clear hardware pad:', e.message);
      }
    }
    
    // Notify parent that signature is cleared
    if (onChange) {
      onChange('');
    }
  }, [topaz, onChange]);

  const undo = () => {
    if (captureMode === CAPTURE_MODE.HARDWARE) return; // No undo for hardware
    
    if (paths.length > 0) {
      const newPaths = paths.slice(0, -1);
      setPaths(newPaths);
      setHasSignature(newPaths.length > 0);
      
      // Redraw canvas
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
      
      // Notify parent
      if (onChange) {
        const svgPath = pathsToSvgString(newPaths);
        onChange(svgPath);
      }
    }
  };

  // Switch capture mode
  const switchMode = useCallback(async (mode) => {
    // Clear current signature when switching
    await clear();
    setCaptureMode(mode);
    
    // Auto-start hardware capture when switching to hardware mode
    if (mode === CAPTURE_MODE.HARDWARE && topaz.isConnected && topaz.isTabletConnected) {
      setIsHardwareCapturing(true);
      await topaz.clearSignature(); // Clear the physical pad
      await topaz.startCapture();
    } else {
      setIsHardwareCapturing(false);
    }
  }, [clear, topaz]);

  // Start hardware capture (also used for retry/restart)
  const startHardwareCapture = useCallback(async () => {
    if (!topaz.isConnected || !topaz.isTabletConnected) {
      return;
    }

    await topaz.clearSignature(); // Clear any previous signature on pad
    setIsHardwareCapturing(true);
    await topaz.startCapture();
  }, [topaz]);

  // Accept hardware signature
  const acceptHardwareSignature = useCallback(async () => {
    if (!isHardwareCapturing) return;

    const result = await topaz.stopCapture(CANVAS_WIDTH, CANVAS_HEIGHT);
    setIsHardwareCapturing(false);

    if (result.hasSignature && result.svgPath) {
      setHardwareSignatureSVG(result.svgPath);
      setHasSignature(true);
      
      // Draw the SVG path on the hardware canvas for preview
      const canvas = hardwareCanvasRef.current;
      if (canvas) {
        drawSVGPathOnCanvas(canvas, result.svgPath);
      }
      
      // Notify parent with SVG path data - THIS IS CRITICAL for form validation
      if (onChange) {
        console.log('[SignaturePad] Sending signature to parent:', result.svgPath.substring(0, 50) + '...');
        onChange(result.svgPath);
      }
    } else {
      console.log('[SignaturePad] No signature to accept');
    }
  }, [isHardwareCapturing, topaz, onChange, drawSVGPathOnCanvas]);

  // Cancel hardware capture
  const cancelHardwareCapture = useCallback(async () => {
    await topaz.stopCapture();
    await topaz.clearSignature();
    setIsHardwareCapturing(false);
  }, [topaz]);

  // Redraw hardware signature on canvas when SVG changes
  useEffect(() => {
    if (hardwareSignatureSVG && hardwareCanvasRef.current) {
      drawSVGPathOnCanvas(hardwareCanvasRef.current, hardwareSignatureSVG);
    }
  }, [hardwareSignatureSVG, drawSVGPathOnCanvas]);

  // Auto-start capture when hardware becomes available while in hardware mode
  useEffect(() => {
    if (
      captureMode === CAPTURE_MODE.HARDWARE && 
      topaz.isConnected && 
      topaz.isTabletConnected && 
      !isHardwareCapturing && 
      !hardwareSignatureSVG
    ) {
      // Start capture automatically
      const autoStart = async () => {
        console.log('[SignaturePad] Auto-starting hardware capture');
        await topaz.clearSignature();
        setIsHardwareCapturing(true);
        await topaz.startCapture();
      };
      autoStart();
    }
  }, [captureMode, topaz.isConnected, topaz.isTabletConnected, isHardwareCapturing, hardwareSignatureSVG, topaz]);

  // Retry hardware connection
  const retryConnection = useCallback(async () => {
    await topaz.connect();
  }, [topaz]);

  // Show hardware option if: enabled AND (connected OR still detecting)
  // Don't show if we've finished detecting and determined CANVAS fallback
  const showHardwareOption = enableHardware && (
    topaz.isDetecting || 
    topaz.connectionType === CONNECTION_TYPE.SIGWEB || 
    topaz.connectionType === CONNECTION_TYPE.SDK
  );
  const isHardwareAvailable = topaz.isConnected && topaz.isTabletConnected;

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      
      {/* Mode Selector - show if hardware is available or still detecting */}
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
            disabled={topaz.isDetecting || !topaz.isConnected}
          >
            <FontAwesomeIcon icon={faTabletAlt} />
            <span>{topaz.isDetecting ? 'Detecting...' : 'Signature Pad'}</span>
            {topaz.isDetecting && <FontAwesomeIcon icon={faSpinner} spin style={{ marginLeft: '0.5rem' }} />}
          </button>
        </div>
      )}

      {/* Status indicator for hardware mode */}
      {showHardwareOption && captureMode === CAPTURE_MODE.HARDWARE && (
        <div className="signature-status">
          {topaz.isDetecting ? (
            <span className="status-detecting">
              <FontAwesomeIcon icon={faSpinner} spin />
              Detecting signature pad...
            </span>
          ) : topaz.isConnected ? (
            topaz.isTabletConnected ? (
              <span className="status-connected">
                <FontAwesomeIcon icon={faPlug} />
                Pad Connected {topaz.tabletModel && `(${topaz.tabletModel})`}
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
              {topaz.connectionError || 'SigWeb not detected - ensure it\'s running'}
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
              width={400}
              height={120}
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
              // Show captured signature rendered on canvas
              <div className="hardware-signature-preview">
                <canvas
                  ref={hardwareCanvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="signature-canvas hardware-preview-canvas"
                />
                <div className="capture-actions" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={startHardwareCapture}
                  >
                    <FontAwesomeIcon icon={faSync} />
                    Re-sign
                  </button>
                </div>
              </div>
            ) : isHardwareCapturing ? (
              // Capturing in progress - auto-started when tab selected
              <div className="hardware-capture-active">
                <div className="capture-status">
                  <FontAwesomeIcon icon={faTabletAlt} className="pulse-icon" />
                  <span>Sign on the pad now...</span>
                  {topaz.pointCount > 0 && (
                    <span className="point-count">({topaz.pointCount} points)</span>
                  )}
                </div>
                <div className="capture-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-primary"
                    onClick={acceptHardwareSignature}
                    disabled={!topaz.hasPoints}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    Accept Signature
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={async () => {
                      await topaz.clearSignature();
                    }}
                    disabled={!topaz.hasPoints}
                  >
                    <FontAwesomeIcon icon={faEraser} />
                    Clear Pad
                  </button>
                </div>
              </div>
            ) : isHardwareAvailable ? (
              // Hardware available but not capturing - auto-start
              <div className="hardware-capture-ready">
                <div className="capture-status">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Starting capture...</span>
                </div>
              </div>
            ) : (
              // Hardware not available
              <div className="hardware-capture-ready">
                <div className="hardware-unavailable">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  <span>
                    {topaz.isConnected 
                      ? 'Connect signature pad to continue'
                      : 'Start SigWeb service to use signature pad'
                    }
                  </span>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={retryConnection}
                    style={{ marginTop: '0.5rem' }}
                  >
                    <FontAwesomeIcon icon={faSync} />
                    Retry
                  </button>
                </div>
              </div>
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
            disabled={!hasSignature && !isHardwareCapturing}
          >
            <FontAwesomeIcon icon={faEraser} />
          </button>
        </div>
      </div>

      {/* Error display */}
      {topaz.error && (
        <div className="signature-error">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          {topaz.error}
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
