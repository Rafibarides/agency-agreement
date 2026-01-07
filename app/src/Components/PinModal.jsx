import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { verifyPin } from '../utils/api';
import colors from '../utils/colors';

const PinModal = ({ isOpen, onClose, onSuccess, title = 'Enter PIN' }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError('');
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join('');
      handleSubmit(fullPin);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = async (fullPin = pin.join('')) => {
    if (fullPin.length !== 4) {
      setError('Please enter 4 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyPin(fullPin);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError('Invalid PIN');
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '320px', textAlign: 'center' }}
      >
        <button 
          className="modal-close" 
          onClick={onClose}
          style={{ 
            position: 'absolute', 
            top: '1rem', 
            right: '1rem',
            background: 'none',
            border: 'none',
            color: colors.textPrimary,
            cursor: 'pointer',
            fontSize: '1.25rem'
          }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <FontAwesomeIcon 
            icon={faLock} 
            style={{ 
              fontSize: '2.5rem', 
              color: colors.accentPink,
              marginBottom: '1rem'
            }} 
          />
          <h3 style={{ margin: 0, color: colors.textPrimary }}>{title}</h3>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              style={{
                width: '50px',
                height: '60px',
                fontSize: '1.5rem',
                textAlign: 'center',
                background: colors.glassBg,
                border: `2px solid ${error ? colors.errorRed : colors.glassBorder}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          ))}
        </div>

        {error && (
          <p style={{ 
            color: colors.errorRed, 
            margin: '0 0 1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </p>
        )}

        {loading && (
          <div style={{ color: colors.textSecondary }}>
            <FontAwesomeIcon icon={faSpinner} spin /> Verifying...
          </div>
        )}
      </div>
    </div>
  );
};

export default PinModal;

