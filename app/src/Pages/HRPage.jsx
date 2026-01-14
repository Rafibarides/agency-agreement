import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserPlus, 
  faUser,
  faSpinner,
  faCheck,
  faSignOutAlt,
  faQrcode,
  faBox,
  faSync
} from '@fortawesome/free-solid-svg-icons';
import BarcodeModal from '../Components/BarcodeModal';
import { holdForSignature, getProvisionedDevices, TITLE_OPTIONS } from '../utils/api';
import colors from '../utils/colors';

// Notification sound for new provisioned devices
const notificationSound = new Audio(`${import.meta.env.BASE_URL}Notification.mp3`);

const HRPage = ({ userEmail, onLogout }) => {
  const [formData, setFormData] = useState({
    name: '',
    title: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeData, setBarcodeData] = useState({ rowNumber: null, name: '' });
  
  // Provisioned devices state
  const [provisionedDevices, setProvisionedDevices] = useState([]);
  const [loadingProvisioned, setLoadingProvisioned] = useState(false);
  
  // Track known device row numbers for this session (to detect new ones)
  const knownDeviceIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  // Fetch provisioned devices on mount
  useEffect(() => {
    fetchProvisionedDevices();
  }, []);

  const playNotificationSound = () => {
    try {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    } catch (err) {
      console.log('Notification sound error:', err);
    }
  };

  const fetchProvisionedDevices = async () => {
    setLoadingProvisioned(true);
    try {
      const result = await getProvisionedDevices();
      if (result.success) {
        const devices = result.devices || [];
        
        // Check for new devices (only after first load)
        if (!isFirstLoad.current) {
          const newDevices = devices.filter(
            device => device.rowNumber && !knownDeviceIds.current.has(device.rowNumber)
          );
          
          // Play notification if there are new devices
          if (newDevices.length > 0) {
            playNotificationSound();
          }
        }
        
        // Update known device IDs
        devices.forEach(device => {
          if (device.rowNumber) {
            knownDeviceIds.current.add(device.rowNumber);
          }
        });
        
        isFirstLoad.current = false;
        setProvisionedDevices(devices);
      }
    } catch (err) {
      console.error('Failed to fetch provisioned devices:', err);
    } finally {
      setLoadingProvisioned(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setMessage({ type: '', text: '' });
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Please enter the new hire\'s name';
    if (!formData.title) return 'Please select a title';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // Create a minimal form data object for holding
      // The IT team will complete the rest when they scan the barcode
      const submitData = {
        name: formData.name.trim(),
        title: formData.title,
        workerId: '', // Will be filled by IT
        hasDifferentTrainingId: false,
        trainingWorkerId: '',
        device: true, // Default to device request
        deviceName: '',
        portableCharger: false,
        protectiveCover: false,
        keyboard: false,
        serialNumber: '',
        esperIdentifier: '',
        exchangeDevice: false,
        returningDeviceName: '',
        returningSerial: '',
        agreement1: false,
        agreement2: false,
        agreement3: false,
        // HR metadata
        requestedBy: userEmail,
        requestType: 'new_hire'
      };

      const result = await holdForSignature(submitData);
      
      if (result.success && result.rowNumber) {
        setBarcodeData({
          rowNumber: result.rowNumber,
          name: formData.name.trim()
        });
        setShowBarcodeModal(true);
        setMessage({ type: 'success', text: 'Device request created!' });
        
        // Reset form
        setFormData({ name: '', title: '' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create request' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      {/* Header with logout */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        padding: '0.75rem 1rem',
        background: `linear-gradient(135deg, ${colors.mutedPurple}20, ${colors.mutedPurple}10)`,
        borderRadius: '8px',
        border: `1px solid ${colors.glassBorder}`
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: colors.textSecondary,
          fontSize: '0.9rem'
        }}>
          <FontAwesomeIcon icon={faUser} style={{ color: colors.accentPink }} />
          <span>{userEmail}</span>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            padding: '0.4rem 0.6rem',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = colors.accentPink}
          onMouseOut={(e) => e.currentTarget.style.color = colors.textMuted}
        >
          <FontAwesomeIcon icon={faSignOutAlt} />
          Sign Out
        </button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Column - Form */}
        <div className="form-section" style={{ flex: '1 1 400px', minWidth: '320px' }}>
        <h2 className="form-section-title">
          <FontAwesomeIcon icon={faUserPlus} />
          Request Device for New Hire
        </h2>
        
        <p style={{ 
          color: colors.textSecondary, 
          marginBottom: '1.5rem', 
          fontSize: '0.95rem',
          lineHeight: 1.6
        }}>
          Create a device request for a new employee. A barcode will be generated 
          that IT can scan to complete the full property agreement form.
        </p>

        {message.text && (
          <div className={`message message-${message.type}`} style={{ marginBottom: '1.5rem' }}>
            <FontAwesomeIcon icon={message.type === 'success' ? faCheck : faQrcode} />
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Hire Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter full name"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Title / Position</label>
            <select
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-select"
              disabled={submitting}
            >
              {TITLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '220px' }}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Creating Request...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUserPlus} />
                  Request Device
                </>
              )}
            </button>
          </div>
        </form>
        </div>

        {/* Right Column - Provisioned Devices */}
        <div style={{ 
          flex: '0 0 280px',
          minWidth: '250px',
          background: 'var(--glass-background)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '1.25rem',
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: `1px solid rgba(255, 183, 77, 0.2)`
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '0.9rem', 
              fontWeight: 600,
              color: '#FFB74D',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FontAwesomeIcon icon={faBox} />
              Ready for Pickup
            </h3>
            <button
              onClick={fetchProvisionedDevices}
              disabled={loadingProvisioned}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                cursor: loadingProvisioned ? 'wait' : 'pointer',
                padding: '0.35rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => !loadingProvisioned && (e.currentTarget.style.color = '#FFB74D')}
              onMouseOut={(e) => e.currentTarget.style.color = colors.textMuted}
              title="Refresh list"
            >
              <FontAwesomeIcon icon={faSync} spin={loadingProvisioned} size="sm" />
            </button>
          </div>

          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            marginRight: '-0.5rem',
            paddingRight: '0.5rem'
          }}>
            {loadingProvisioned ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem 1rem',
                color: colors.textMuted,
                fontSize: '0.85rem'
              }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
                Loading...
              </div>
            ) : provisionedDevices.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem 1rem',
                color: colors.textMuted,
                fontSize: '0.85rem'
              }}>
                No devices ready for pickup
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {provisionedDevices.map((device, index) => (
                  <div
                    key={device.rowNumber || index}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 183, 77, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 183, 77, 0.15)'
                    }}
                  >
                    <div style={{ 
                      fontWeight: 600, 
                      fontSize: '0.9rem',
                      color: colors.textPrimary,
                      marginBottom: '0.25rem'
                    }}>
                      {device.Name || 'Unknown'}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: colors.textMuted,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem'
                    }}>
                      {device.Title && (
                        <span>{device.Title.split('–')[0].trim()}</span>
                      )}
                      {device['Serial Number'] && (
                        <span>S/N: {device['Serial Number']}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ 
            marginTop: '0.75rem', 
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--glass-border)',
            fontSize: '0.7rem',
            color: colors.textMuted,
            textAlign: 'center'
          }}>
            {provisionedDevices.length} device{provisionedDevices.length !== 1 ? 's' : ''} provisioned
          </div>
        </div>
      </div>

      {/* Barcode Modal */}
      <BarcodeModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        rowNumber={barcodeData.rowNumber}
        name={barcodeData.name}
        workerId="(Pending)"
        requestedBy={userEmail}
      />
    </div>
  );
};

export default HRPage;
