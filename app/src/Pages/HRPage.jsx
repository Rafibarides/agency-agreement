import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserPlus, 
  faUser,
  faSpinner,
  faCheck,
  faSignOutAlt,
  faQrcode
} from '@fortawesome/free-solid-svg-icons';
import BarcodeModal from '../Components/BarcodeModal';
import { holdForSignature, TITLE_OPTIONS } from '../utils/api';
import colors from '../utils/colors';

const HRPage = ({ userEmail, onLogout }) => {
  const [formData, setFormData] = useState({
    name: '',
    title: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeData, setBarcodeData] = useState({ rowNumber: null, name: '' });

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
    <div className="page-container">
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

      {/* Main Content */}
      <div className="form-section">
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
                  <FontAwesomeIcon icon={faQrcode} />
                  Generate Barcode
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Card */}
        <div style={{
          marginTop: '2.5rem',
          padding: '1.25rem',
          background: `linear-gradient(135deg, ${colors.accentPink}10, ${colors.softPink}08)`,
          borderRadius: '10px',
          border: `1px solid ${colors.accentPink}30`
        }}>
          <h4 style={{ 
            margin: '0 0 0.75rem', 
            color: colors.accentPink,
            fontSize: '0.95rem',
            fontWeight: 600
          }}>
            How it works
          </h4>
          <ol style={{ 
            margin: 0, 
            paddingLeft: '1.25rem', 
            color: colors.textSecondary,
            fontSize: '0.9rem',
            lineHeight: 1.8
          }}>
            <li>Enter the new hire's name and title above</li>
            <li>Print or save the generated barcode</li>
            <li>Give the barcode to IT or the new hire</li>
            <li>IT scans the barcode to load and complete the form</li>
          </ol>
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
