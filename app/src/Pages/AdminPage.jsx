import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, 
  faSignInAlt, 
  faSignOutAlt,
  faSpinner,
  faExclamationTriangle,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import List from '../Components/List';
import MultiDeviceReport from '../Components/MultiDeviceReport';
import { adminLogin, getAllAgreements, searchAgreements } from '../utils/api';
import colors from '../utils/colors';

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if already authenticated (session)
  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch agreements when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAgreements();
    }
  }, [isAuthenticated]);

  // Search with debounce
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        fetchAgreements();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const result = await getAllAgreements();
      if (result.success) {
        setAgreements(result.agreements || []);
      }
    } catch (err) {
      console.error('Failed to fetch agreements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await searchAgreements(searchQuery);
      if (result.success) {
        setAgreements(result.agreements || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await adminLogin(username, password);
      
      if (result.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('adminAuth', 'true');
        setUsername('');
        setPassword('');
      } else {
        setLoginError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Network error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
    setAgreements([]);
    setSearchQuery('');
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="page-container">
        <div className="login-container">
          <div className="form-section" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <FontAwesomeIcon 
                icon={faShieldAlt} 
                size="3x" 
                style={{ color: colors.accentPink, marginBottom: '1rem' }} 
              />
              <h1 className="login-title">Admin Portal</h1>
              <p style={{ color: colors.textMuted, fontSize: '0.9rem' }}>
                Please enter your credentials to access the admin panel
              </p>
            </div>

            {loginError && (
              <div className="message message-error" style={{ marginBottom: '1.5rem' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" style={{ textAlign: 'left' }}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ textAlign: 'left' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loginLoading || !username || !password}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {loginLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Authenticating...
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
  }

  // Admin Dashboard
  return (
    <div className="page-container wide">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '600', 
            marginBottom: '0.5rem' 
          }}>
            <FontAwesomeIcon icon={faLock} style={{ marginRight: '0.75rem', color: colors.accentPink }} />
            Agreements Management
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '0.9rem' }}>
            View and manage all submitted property agreements
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <MultiDeviceReport />
          <button className="btn btn-secondary" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} />
            Sign Out
          </button>
        </div>
      </div>

      <List 
        agreements={agreements}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
};

export default AdminPage;

