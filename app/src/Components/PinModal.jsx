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
        style={{ 
          maxWidth: '300px', 
          textAlign: 'center',
          padding: '1.5rem',
          position: 'relative'
        }}
      >
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', 
            top: '0.75rem', 
            right: '0.75rem',
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0.25rem',
            lineHeight: 1
          }}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div style={{ 
          marginBottom: '1.25rem', 
          paddingTop: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <FontAwesomeIcon 
            icon={faLock} 
            style={{ 
              fontSize: '1.75rem', 
              color: colors.accentPink,
              marginBottom: '0.75rem'
            }} 
          />
          <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: '1.1rem' }}>{title}</h3>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              autoComplete="off"
              style={{
                width: '48px',
                height: '56px',
                fontSize: '2rem',
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
            margin: 0,
            fontSize: '0.85rem'
          }}>
            {error}
          </p>
        )}

        {loading && (
          <div style={{ color: colors.textSecondary, fontSize: '0.9rem' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
            Verifying...
          </div>
        )}
      </div>
    </div>
  );
};

export default PinModal;

