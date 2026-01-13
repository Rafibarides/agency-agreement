import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBarcode, 
  faSpinner,
  faCheck,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { getAgreementByRowNumber } from '../utils/api';
import colors from '../utils/colors';

const BarcodeScanner = ({ onFormLoaded, disabled = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const inputRef = useRef(null);
  const lastKeystrokeTime = useRef(0);
  const keystrokeBuffer = useRef('');

  // Barcode scanners type very fast (usually < 50ms between characters)
  // Regular typing is slower. We use this to detect scanner input.
  const SCANNER_THRESHOLD_MS = 100;

  useEffect(() => {
    // Clear status after 3 seconds
    if (status.message) {
      const timer = setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const parseBarcode = (code) => {
    // Expected format: APF-{rowNumber}
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
        
        // Convert spreadsheet data to form data format (same as APFList)
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

        setStatus({ type: 'success', message: `Loaded form for ${formData.name}` });
        setInputValue('');
        
        if (onFormLoaded) {
          onFormLoaded(formData);
        }
      } else {
        setStatus({ type: 'error', message: result.error || 'Agreement not found' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to load form. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Check for fast typing (barcode scanner)
    const now = Date.now();
    const timeSinceLastKey = now - lastKeystrokeTime.current;
    
    if (timeSinceLastKey < SCANNER_THRESHOLD_MS) {
      keystrokeBuffer.current += value.slice(-1);
    } else {
      keystrokeBuffer.current = value.slice(-1);
    }
    
    lastKeystrokeTime.current = now;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const rowNumber = parseBarcode(inputValue);
    
    if (rowNumber) {
      loadFormByRowNumber(rowNumber);
    } else if (inputValue.trim()) {
      // Try to parse as just a number
      const numOnly = parseInt(inputValue.trim(), 10);
      if (!isNaN(numOnly) && numOnly > 0) {
        loadFormByRowNumber(numOnly);
      } else {
        setStatus({ type: 'error', message: 'Invalid barcode format. Expected: APF-123' });
      }
    }
  };

  return (
    <div className="barcode-scanner-container">
      <div className="barcode-scanner-input-wrapper">
        <FontAwesomeIcon 
          icon={faBarcode} 
          className="barcode-scanner-icon"
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Scan barcode or type APF-123..."
          className="form-input barcode-scanner-input"
          disabled={disabled || loading}
          autoComplete="off"
        />
        {loading && (
          <FontAwesomeIcon 
            icon={faSpinner} 
            spin 
            className="barcode-scanner-loading"
          />
        )}
      </div>
      
      {status.message && (
        <div className={`barcode-scanner-status ${status.type}`}>
          <FontAwesomeIcon 
            icon={status.type === 'success' ? faCheck : faExclamationTriangle} 
          />
          {status.message}
        </div>
      )}
      
      <p className="barcode-scanner-hint">
        Scan a printed barcode or manually enter the code to load a held form
      </p>
    </div>
  );
};

export default BarcodeScanner;
