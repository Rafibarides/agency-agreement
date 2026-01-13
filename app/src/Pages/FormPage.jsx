import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faIdCard, 
  faLaptop, 
  faFileSignature,
  faExchangeAlt,
  faCheck,
  faPaperPlane,
  faSpinner,
  faEnvelope,
  faPause,
  faClipboardList,
  faQrcode,
  faBarcode
} from '@fortawesome/free-solid-svg-icons';
import SignaturePad from '../Components/SignaturePad';
import PinModal from '../Components/PinModal';
import BarcodeModal from '../Components/BarcodeModal';
import BarcodeScanner from '../Components/BarcodeScanner';
import { 
  submitAgreement, 
  holdForSignature,
  updateWithSignatures,
  COMPANY_INFO, 
  TITLE_OPTIONS, 
  PROPERTY_ITEMS, 
  AGREEMENTS 
} from '../utils/api';
import colors from '../utils/colors';

const FormPage = ({ prefillData, onReset }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const initialFormState = {
    name: '',
    title: '',
    workerId: '',
    hasDifferentTrainingId: false,
    trainingWorkerId: '',
    device: false,
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
    employeeSignatureDate: today,
    employeeSignature: '',
    supervisorSignatureDate: today,
    supervisorSignature: '',
    sendCopyToEmployee: false,
    employeeEmail: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [holdingForSig, setHoldingForSig] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showHoldPinModal, setShowHoldPinModal] = useState(false);
  const [showBarcodePinModal, setShowBarcodePinModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeData, setBarcodeData] = useState({ rowNumber: null, name: '', workerId: '' });
  const [isPrefilled, setIsPrefilled] = useState(false);

  // Handle prefillData when coming from APF list
  useEffect(() => {
    if (prefillData) {
      setFormData({
        ...initialFormState,
        ...prefillData,
        employeeSignatureDate: today,
        supervisorSignatureDate: today,
        employeeSignature: '',
        supervisorSignature: ''
      });
      setIsPrefilled(true);
      setMessage({ 
        type: 'info', 
        text: 'Form prefilled. Please add signatures to complete.' 
      });
    }
  }, [prefillData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePropertyToggle = (propertyId) => {
    setFormData(prev => ({
      ...prev,
      [propertyId]: !prev[propertyId],
      ...(propertyId === 'device' && prev.device ? { deviceName: '' } : {})
    }));
  };

  const handleAgreementToggle = (agreementId) => {
    setFormData(prev => ({
      ...prev,
      [agreementId]: !prev[agreementId]
    }));
  };

  const handleSignatureChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateFormForHold = () => {
    if (!formData.name.trim()) return 'Please enter your name';
    if (!formData.title) return 'Please select your title';
    if (!formData.workerId) return 'Please enter your Worker ID';
    if (formData.hasDifferentTrainingId && !formData.trainingWorkerId) {
      return 'Please enter your Training Worker ID';
    }
    if (!formData.device && !formData.portableCharger && !formData.protectiveCover && !formData.keyboard) {
      return 'Please select at least one property item';
    }
    if (formData.device && !formData.deviceName.trim()) {
      return 'Please enter the device name';
    }
    if (formData.exchangeDevice && !formData.returningDeviceName.trim()) {
      return 'Please enter the returning device name';
    }
    if (!formData.agreement1 || !formData.agreement2 || !formData.agreement3) {
      return 'Please agree to all terms and conditions';
    }
    return null;
  };

  const validateForm = () => {
    const holdError = validateFormForHold();
    if (holdError) return holdError;
    
    if (!formData.employeeSignature) return 'Employee signature is required';
    if (!formData.supervisorSignature) return 'Supervisor signature is required';
    if (formData.sendCopyToEmployee && !formData.employeeEmail.trim()) {
      return 'Please enter your email address to receive a copy';
    }
    if (formData.sendCopyToEmployee && formData.employeeEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.employeeEmail.trim())) {
        return 'Please enter a valid email address';
      }
    }
    return null;
  };

  const handleHoldPinSuccess = async () => {
    setHoldingForSig(true);
    setMessage({ type: '', text: '' });

    try {
      const submitData = {
        ...formData,
        trainingWorkerId: formData.hasDifferentTrainingId 
          ? formData.trainingWorkerId 
          : formData.workerId
      };

      const result = await holdForSignature(submitData);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Form held for signature. It can be accessed from the APF menu.' });
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to hold form' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setHoldingForSig(false);
    }
  };

  const handleHoldForSignature = () => {
    const error = validateFormForHold();
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }
    setShowHoldPinModal(true);
  };

  const handleHoldWithBarcode = () => {
    const error = validateFormForHold();
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }
    setShowBarcodePinModal(true);
  };

  const handleBarcodePinSuccess = async () => {
    setHoldingForSig(true);
    setMessage({ type: '', text: '' });

    try {
      const submitData = {
        ...formData,
        trainingWorkerId: formData.hasDifferentTrainingId 
          ? formData.trainingWorkerId 
          : formData.workerId
      };

      const result = await holdForSignature(submitData);
      
      if (result.success && result.rowNumber) {
        // Store barcode data and show modal
        setBarcodeData({
          rowNumber: result.rowNumber,
          name: formData.name,
          workerId: formData.workerId
        });
        setShowBarcodeModal(true);
        setMessage({ type: 'success', text: 'Form held. Print or download the barcode below.' });
        resetForm();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to hold form' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setHoldingForSig(false);
    }
  };

  const handleBarcodeFormLoaded = (loadedFormData) => {
    setFormData({
      ...initialFormState,
      ...loadedFormData,
      employeeSignatureDate: today,
      supervisorSignatureDate: today,
      employeeSignature: '',
      supervisorSignature: ''
    });
    setIsPrefilled(true);
    setMessage({ 
      type: 'info', 
      text: `Form loaded for ${loadedFormData.name}. Please add signatures to complete.` 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({
      ...initialFormState,
      employeeSignatureDate: today,
      supervisorSignatureDate: today
    });
    setIsPrefilled(false);
    if (onReset) onReset();
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
      const submitData = {
        ...formData,
        trainingWorkerId: formData.hasDifferentTrainingId 
          ? formData.trainingWorkerId 
          : formData.workerId
      };

      // Use updateWithSignatures if this is a prefilled form, otherwise submit new
      const result = isPrefilled 
        ? await updateWithSignatures(submitData)
        : await submitAgreement(submitData);
      
      if (result.success) {
        const emailMsg = submitData.sendCopyToEmployee 
          ? ' A copy has been sent to your email.' 
          : '';
        const actionMsg = isPrefilled ? 'completed' : 'submitted';
        setMessage({ type: 'success', text: `Agreement ${actionMsg} successfully!${emailMsg}` });
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit agreement' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {message.text && (
        <div className={`message message-${message.type}`}>
          <FontAwesomeIcon icon={message.type === 'success' ? faCheck : message.type === 'info' ? faClipboardList : faSpinner} />
          {message.text}
        </div>
      )}

      {isPrefilled && (
        <div className="prefill-banner glass-subtle" style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${colors.accentPink}20, ${colors.softPink}10)`,
          border: `1px solid ${colors.accentPink}40`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <FontAwesomeIcon icon={faClipboardList} style={{ color: colors.accentPink }} />
          <span style={{ color: colors.textPrimary, fontSize: '0.9rem' }}>
            <strong>Prefilled Form:</strong> Complete by adding signatures below
          </span>
        </div>
      )}

      {/* Barcode Scanner - Quick form loading */}
      {!isPrefilled && (
        <div className="barcode-scanner-section glass-subtle" style={{
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${colors.mutedPurple}15, ${colors.mutedPurple}05)`,
          border: `1px solid ${colors.glassBorder}`
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '0.75rem',
            color: colors.accentPink,
            fontSize: '0.95rem',
            fontWeight: '600'
          }}>
            <FontAwesomeIcon icon={faBarcode} />
            Quick Load
          </div>
          <BarcodeScanner onFormLoaded={handleBarcodeFormLoaded} />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-section" style={{ marginTop: '1.5rem' }}>
          {/* Personal Information */}
          <h2 className="form-section-title">
            <FontAwesomeIcon icon={faUser} />
            Personal Information
          </h2>
          
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Title</label>
            <select
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-select"
            >
              {TITLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Worker ID</label>
            <input
              type="number"
              name="workerId"
              value={formData.workerId}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your Worker ID"
            />
          </div>

          <div className="checkbox-group" style={{ gridTemplateColumns: '1fr' }}>
            <div 
              className={`checkbox-item ${formData.hasDifferentTrainingId ? 'checked' : ''}`}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                hasDifferentTrainingId: !prev.hasDifferentTrainingId 
              }))}
              role="checkbox"
              aria-checked={formData.hasDifferentTrainingId}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setFormData(prev => ({ 
                ...prev, 
                hasDifferentTrainingId: !prev.hasDifferentTrainingId 
              }))}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span className="checkbox-custom">
                <FontAwesomeIcon icon={faCheck} size="sm" />
              </span>
              <span className="checkbox-label">
                Worker ID is different from Training Worker ID
              </span>
            </div>
          </div>

          {formData.hasDifferentTrainingId && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Training Worker ID</label>
              <input
                type="number"
                name="trainingWorkerId"
                value={formData.trainingWorkerId}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your Training Worker ID"
              />
            </div>
          )}

          {/* Property Acknowledgement */}
          <h2 className="form-section-title" style={{ marginTop: '2rem' }}>
            <FontAwesomeIcon icon={faLaptop} />
            Acknowledgement of Received Property
          </h2>
          
          <p style={{ color: colors.textSecondary, marginBottom: '1.25rem', fontSize: '0.95rem' }}>
            Select all items received:
          </p>

          <div className="checkbox-group">
            {PROPERTY_ITEMS.map(item => (
              <div 
                key={item.id}
                className={`checkbox-item ${formData[item.id] ? 'checked' : ''}`}
                onClick={() => handlePropertyToggle(item.id)}
                role="checkbox"
                aria-checked={formData[item.id]}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handlePropertyToggle(item.id)}
              >
                <span className="checkbox-custom">
                  <FontAwesomeIcon icon={faCheck} size="sm" />
                </span>
                <span className="checkbox-label">
                  {item.label}
                  {item.hasInput && formData[item.id] && (
                    <input
                      type="text"
                      name="deviceName"
                      value={formData.deviceName}
                      onChange={handleInputChange}
                      onClick={(e) => e.stopPropagation()}
                      className="form-input inline-input"
                      placeholder={item.placeholder}
                    />
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label className="form-label">Serial Number (Optional)</label>
            <input
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter device serial number"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Esper Identifier Code (Optional)</label>
            <input
              type="text"
              name="esperIdentifier"
              value={formData.esperIdentifier}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter Esper identifier code"
            />
          </div>

          {/* Device Exchange */}
          <h2 className="form-section-title" style={{ marginTop: '2rem' }}>
            <FontAwesomeIcon icon={faExchangeAlt} />
            Device Exchange
          </h2>

          <div className="checkbox-group">
            <div 
              className={`checkbox-item ${formData.exchangeDevice ? 'checked' : ''}`}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                exchangeDevice: !prev.exchangeDevice,
                ...(!prev.exchangeDevice ? {} : { returningDeviceName: '', returningSerial: '' })
              }))}
              role="checkbox"
              aria-checked={formData.exchangeDevice}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setFormData(prev => ({ 
                ...prev, 
                exchangeDevice: !prev.exchangeDevice
              }))}
            >
              <span className="checkbox-custom">
                <FontAwesomeIcon icon={faCheck} size="sm" />
              </span>
              <span className="checkbox-label">
                I want to exchange a device
                <small>Check this if you are returning a device</small>
              </span>
            </div>
          </div>

          {formData.exchangeDevice && (
            <>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Returning Device Name</label>
                <input
                  type="text"
                  name="returningDeviceName"
                  value={formData.returningDeviceName}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter the device name you are returning"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Returning Device Serial Number</label>
                <input
                  type="text"
                  name="returningSerial"
                  value={formData.returningSerial}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter the serial number of device being returned"
                />
              </div>
            </>
          )}

          {/* Agreements */}
          <h2 className="form-section-title" style={{ marginTop: '2rem' }}>
            <FontAwesomeIcon icon={faIdCard} />
            Terms and Agreements
          </h2>

          <div className="checkbox-group" style={{ flexDirection: 'column' }}>
            {AGREEMENTS.map(agreement => (
              <div 
                key={agreement.id}
                className={`checkbox-item agreement-checkbox ${formData[agreement.id] ? 'checked' : ''}`}
                onClick={() => handleAgreementToggle(agreement.id)}
                role="checkbox"
                aria-checked={formData[agreement.id]}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleAgreementToggle(agreement.id)}
              >
                <span className="checkbox-custom">
                  <FontAwesomeIcon icon={faCheck} size="sm" />
                </span>
                <span className="checkbox-label">
                  <strong style={{ color: colors.accentPink }}>I agree:</strong> {agreement.text}
                </span>
              </div>
            ))}
          </div>

          {/* Hold for Signature Buttons - Only show for new forms, not prefilled */}
          {!isPrefilled && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '2rem',
              padding: '1.5rem',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${colors.mutedPurple}30, ${colors.mutedPurple}10)`,
              border: `1px dashed ${colors.glassBorder}`
            }}>
              <p style={{ 
                color: colors.textSecondary, 
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                Need to collect signatures later?
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleHoldForSignature}
                  disabled={holdingForSig}
                  style={{ minWidth: '180px' }}
                >
                  {holdingForSig ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Holding...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPause} />
                      Hold for Signature
                    </>
                  )}
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleHoldWithBarcode}
                  disabled={holdingForSig}
                  style={{ minWidth: '180px' }}
                >
                  {holdingForSig ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faQrcode} />
                      Hold + Barcode
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Signatures */}
          <h2 className="form-section-title" style={{ marginTop: '2rem' }}>
            <FontAwesomeIcon icon={faFileSignature} />
            Signatures
          </h2>

          <div className="form-group">
            <label className="form-label">Employee Signature Date</label>
            <input
              type="date"
              name="employeeSignatureDate"
              value={formData.employeeSignatureDate}
              onChange={handleInputChange}
              className="form-input date-input"
            />
          </div>

          <SignaturePad
            label="Employee Signature"
            onChange={(value) => handleSignatureChange('employeeSignature', value)}
          />

          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label className="form-label">Supervisor Signature Date</label>
            <input
              type="date"
              name="supervisorSignatureDate"
              value={formData.supervisorSignatureDate}
              onChange={handleInputChange}
              className="form-input date-input"
            />
          </div>

          <SignaturePad
            label="Supervisor Signature"
            onChange={(value) => handleSignatureChange('supervisorSignature', value)}
          />

          {/* Email Copy Option */}
          <h2 className="form-section-title" style={{ marginTop: '2rem' }}>
            <FontAwesomeIcon icon={faEnvelope} />
            Email Notification
          </h2>

          <div className="checkbox-group" style={{ gridTemplateColumns: '1fr' }}>
            <div 
              className={`checkbox-item ${formData.sendCopyToEmployee ? 'checked' : ''}`}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                sendCopyToEmployee: !prev.sendCopyToEmployee,
                ...(!prev.sendCopyToEmployee ? {} : { employeeEmail: '' })
              }))}
              role="checkbox"
              aria-checked={formData.sendCopyToEmployee}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setFormData(prev => ({ 
                ...prev, 
                sendCopyToEmployee: !prev.sendCopyToEmployee
              }))}
            >
              <span className="checkbox-custom">
                <FontAwesomeIcon icon={faCheck} size="sm" />
              </span>
              <span className="checkbox-label">
                Send a copy of the signed agreement to my email
              </span>
            </div>
          </div>

          {formData.sendCopyToEmployee && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Your Email Address</label>
              <input
                type="email"
                name="employeeEmail"
                value={formData.employeeEmail}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your email address"
              />
              <small style={{ color: colors.textMuted, fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '0.5rem' }} />
                A PDF copy of your signed agreement will be sent to this email
              </small>
            </div>
          )}

          {/* Submit Button */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
              style={{ minWidth: '200px' }}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Submitting...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Submit Agreement
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Company Info Footer */}
      <div className="company-info">
        <strong>{COMPANY_INFO.name}</strong>
        {COMPANY_INFO.address}<br />
        {COMPANY_INFO.city}<br />
        {COMPANY_INFO.phone}
      </div>

      {/* PIN Modal for Hold for Signature */}
      <PinModal
        isOpen={showHoldPinModal}
        onClose={() => setShowHoldPinModal(false)}
        onSuccess={handleHoldPinSuccess}
        title="Enter PIN to Hold Form"
      />

      {/* PIN Modal for Hold with Barcode */}
      <PinModal
        isOpen={showBarcodePinModal}
        onClose={() => setShowBarcodePinModal(false)}
        onSuccess={handleBarcodePinSuccess}
        title="Enter PIN to Hold Form & Generate Barcode"
      />

      {/* Barcode Modal - shows generated barcode for printing */}
      <BarcodeModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        rowNumber={barcodeData.rowNumber}
        name={barcodeData.name}
        workerId={barcodeData.workerId}
      />
    </div>
  );
};

export default FormPage;
