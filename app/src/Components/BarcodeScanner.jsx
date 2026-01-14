import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBarcode, 
  faSpinner,
  faCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { getAgreementByRowNumber } from '../utils/api';

const BarcodeScanner = ({ onFormLoaded, disabled = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const lastKeystrokeTime = useRef(0);

  // Barcode scanners type very fast (usually < 50ms between characters)
  const SCANNER_THRESHOLD_MS = 100;

  // Auto-focus input when expanded
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Clear status after delay
  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => {
        setStatus({ type: '', message: '' });
        if (status.type === 'success') {
          setExpanded(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!inputValue && !loading) {
          setExpanded(false);
        }
      }
    };
    
    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expanded, inputValue, loading]);

  const parseBarcode = (code) => {
    const trimmed = code.trim().toUpperCase();
    const match = trimmed.match(/^APF-(\d+)$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  };

  const loadFormByRowNumber = async (rowNumber) => {
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const result = await getAgreementByRowNumber(rowNumber);
      
      if (result.success && result.agreement) {
        const agreement = result.agreement;
        
        const formData = {
          name: agreement.Name || '',
          title: agreement.Title || '',
          workerId: agreement['Worker ID']?.toString() || '',
          hasDifferentTrainingId: agreement['Has Different Training ID'] || false,
          trainingWorkerId: agreement['Training Worker ID']?.toString() || '',
          device: agreement.Device || false,
          deviceName: agreement['Device Name'] || '',
          portableCharger: agreement['Portable Charger'] || false,
          protectiveCover: agreement['Protective Cover'] || false,
          keyboard: agreement['Keyboard/Accessory'] || false,
          serialNumber: agreement['Serial Number'] || '',
          esperIdentifier: agreement['Esper Identifier Code'] || '',
          exchangeDevice: agreement['Exchange Device'] || false,
          returningDeviceName: agreement['Returning Device Name'] || '',
          returningSerial: agreement['Returning Serial Number'] || '',
          agreement1: agreement['Agreement 1'] || false,
          agreement2: agreement['Agreement 2'] || false,
          agreement3: agreement['Agreement 3'] || false,
          rowNumber: agreement.rowNumber
        };

        setStatus({ type: 'success', message: formData.name });
        setInputValue('');
        
        if (onFormLoaded) {
          onFormLoaded(formData);
        }
      } else {
        setStatus({ type: 'error', message: 'Not found' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    lastKeystrokeTime.current = Date.now();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setExpanded(false);
      setInputValue('');
    }
  };

  const handleSubmit = () => {
    const rowNumber = parseBarcode(inputValue);
    
    if (rowNumber) {
      loadFormByRowNumber(rowNumber);
    } else if (inputValue.trim()) {
      const numOnly = parseInt(inputValue.trim(), 10);
      if (!isNaN(numOnly) && numOnly > 0) {
        loadFormByRowNumber(numOnly);
      } else {
        setStatus({ type: 'error', message: 'Invalid' });
      }
    }
  };

  const handleIconClick = () => {
    if (!disabled && !loading) {
      setExpanded(true);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`barcode-compact ${expanded ? 'expanded' : ''} ${status.type ? `status-${status.type}` : ''}`}
    >
      {!expanded ? (
        <button
          type="button"
          className="barcode-trigger"
          onClick={handleIconClick}
          disabled={disabled}
          title="Scan barcode to load form"
        >
          <FontAwesomeIcon icon={faBarcode} />
          <span>Scan</span>
        </button>
      ) : (
        <div className="barcode-expanded">
          <FontAwesomeIcon icon={faBarcode} className="barcode-input-icon" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="APF-123"
            disabled={loading}
            autoComplete="off"
          />
          {loading ? (
            <FontAwesomeIcon icon={faSpinner} spin className="barcode-status-icon" />
          ) : status.type === 'success' ? (
            <FontAwesomeIcon icon={faCheck} className="barcode-status-icon success" />
          ) : status.type === 'error' ? (
            <FontAwesomeIcon icon={faTimes} className="barcode-status-icon error" />
          ) : (
            <button
              type="button"
              className="barcode-close"
              onClick={() => { setExpanded(false); setInputValue(''); }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
