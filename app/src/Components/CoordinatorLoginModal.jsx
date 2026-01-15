import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faSpinner, 
  faSignInAlt,
  faUsersCog,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import colors from '../utils/colors';

const CoordinatorLoginModal = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate email domain
    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith('@wellboundhc.com')) {
      setError('Please use your @wellboundhc.com email address');
      setLoading(false);
      return;
    }

    // Validate password
    if (password !== 'Welcome!') {
      setError('Invalid password');
      setLoading(false);
      return;
    }

    // Success - simulate brief loading
    setTimeout(() => {
      setLoading(false);
      onSuccess(emailLower);
      setEmail('');
      setPassword('');
      onClose(); // Close the modal after successful login
    }, 500);
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="coordinator-login-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="coordinator-login-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FontAwesomeIcon icon={faUsersCog} style={{ color: '#64B5F6' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              Coordinator Console
            </h3>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="coordinator-login-body">
          <p style={{ 
            color: colors.textSecondary, 
            fontSize: '0.9rem', 
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            Sign in with your Wellbound email to access the coordinator console.
          </p>

          {error && (
            <div className="message message-error" style={{ marginBottom: '1rem' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="yourname@wellboundhc.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !email || !password}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Signing in...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSignInAlt} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorLoginModal;
