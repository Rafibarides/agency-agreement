import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faTimes, faSpinner, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import colors from '../utils/colors';

// Authorized HR emails
const AUTHORIZED_EMAILS = [
  'sbailey@wellboundhc.com',
  'mperez@wellboundhc.com',
  'sabreu@aristacares.com',
  'mhernandez@wellboundhc.com'
];

// HR Portal password
const HR_PASSWORD = 'Welcome!';

const HRLoginModal = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setError('');
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail) {
      setError('Please enter your email');
      return;
    }

    // Simple email validation
    if (!normalizedEmail.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    if (!password) {
      setError('Please enter the password');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate brief delay for UX
    await new Promise(r => setTimeout(r, 300));

    // Check if email is authorized and password is correct
    if (AUTHORIZED_EMAILS.includes(normalizedEmail) && password === HR_PASSWORD) {
      onSuccess(normalizedEmail);
      onClose();
    } else if (!AUTHORIZED_EMAILS.includes(normalizedEmail)) {
      setError('Unauthorized email address');
    } else {
      setError('Invalid password');
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '340px', 
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
            icon={faUserShield} 
            style={{ 
              fontSize: '1.75rem', 
              color: colors.accentPink,
              marginBottom: '0.75rem'
            }} 
          />
          <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: '1.1rem' }}>
            HR Portal Access
          </h3>
          <p style={{ 
            margin: '0.5rem 0 0', 
            color: colors.textMuted, 
            fontSize: '0.85rem' 
          }}>
            Enter your authorized email
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ 
            position: 'relative',
            marginBottom: '0.75rem'
          }}>
            <FontAwesomeIcon 
              icon={faEnvelope} 
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.textMuted
              }}
            />
            <input
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="your.email@company.com"
              disabled={loading}
              autoComplete="email"
              style={{
                width: '100%',
                padding: '0.875rem 1rem 0.875rem 2.75rem',
                fontSize: '0.95rem',
                background: colors.glassBg,
                border: `2px solid ${error ? colors.errorRed : colors.glassBorder}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ 
            position: 'relative',
            marginBottom: '1rem'
          }}>
            <FontAwesomeIcon 
              icon={faLock} 
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.textMuted
              }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              disabled={loading}
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.875rem 1rem 0.875rem 2.75rem',
                fontSize: '0.95rem',
                background: colors.glassBg,
                border: `2px solid ${error ? colors.errorRed : colors.glassBorder}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <p style={{ 
              color: colors.errorRed, 
              margin: '0 0 1rem',
              fontSize: '0.85rem'
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
                Verifying...
              </>
            ) : (
              'Access HR Portal'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HRLoginModal;
