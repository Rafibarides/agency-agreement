import { useRef, useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEraser, faUndo } from '@fortawesome/free-solid-svg-icons';
import colors from '../utils/colors';

const SignaturePad = ({ label, value, onChange }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [hasSignature, setHasSignature] = useState(false);

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

  // Redraw canvas when paths change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = colors.accentPink;
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

    // Update SVG path string
    const svgPath = pathsToSvgString(paths);
    setHasSignature(paths.length > 0 && paths.some(p => p.length > 0));
    if (onChange) {
      onChange(svgPath);
    }
  }, [paths, onChange, pathsToSvgString]);

  // Parse value prop into paths if provided
  useEffect(() => {
    if (value && value !== pathsToSvgString(paths)) {
      // Parse SVG path back into points
      const parsedPaths = [];
      const pathCommands = value.match(/M[^M]*/g) || [];
      
      pathCommands.forEach(cmd => {
        const points = [];
        const coords = cmd.match(/[\d.]+/g);
        
        if (coords) {
          for (let i = 0; i < coords.length; i += 2) {
            points.push({
              x: parseFloat(coords[i]),
              y: parseFloat(coords[i + 1])
            });
          }
        }
        
        if (points.length > 0) {
          parsedPaths.push(points);
        }
      });
      
      if (parsedPaths.length > 0) {
        setPaths(parsedPaths);
      }
    }
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
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    setCurrentPath([coords]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    setCurrentPath(prev => [...prev, coords]);
    
    // Draw live stroke
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = colors.accentPink;
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
      setPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath([]);
  };

  const clear = () => {
    setPaths([]);
    setCurrentPath([]);
    if (onChange) {
      onChange('');
    }
  };

  const undo = () => {
    if (paths.length > 0) {
      setPaths(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="signature-container">
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
        <div className="signature-actions">
          <button
            type="button"
            className="btn btn-small btn-secondary btn-icon"
            onClick={undo}
            title="Undo"
            disabled={paths.length === 0}
          >
            <FontAwesomeIcon icon={faUndo} />
          </button>
          <button
            type="button"
            className="btn btn-small btn-secondary btn-icon"
            onClick={clear}
            title="Clear"
            disabled={!hasSignature}
          >
            <FontAwesomeIcon icon={faEraser} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;

