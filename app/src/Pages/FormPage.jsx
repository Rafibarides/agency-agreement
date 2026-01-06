import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faIdCard, 
  faLaptop, 
  faFileSignature,
  faExchangeAlt,
  faCheck,
  faPaperPlane,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import SignaturePad from '../Components/SignaturePad';
import { 
  submitAgreement, 
  COMPANY_INFO, 
  TITLE_OPTIONS, 
  PROPERTY_ITEMS, 
  AGREEMENTS 
} from '../utils/api';
import colors from '../utils/colors';

const FormPage = () => {
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
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
    supervisorSignature: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

  const validateForm = () => {
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
    if (!formData.employeeSignature) return 'Employee signature is required';
    if (!formData.supervisorSignature) return 'Supervisor signature is required';
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
      const submitData = {
        ...formData,
        trainingWorkerId: formData.hasDifferentTrainingId 
          ? formData.trainingWorkerId 
          : formData.workerId
      };

      const result = await submitAgreement(submitData);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Agreement submitted successfully!' });
        // Reset form
        setFormData({
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
          supervisorSignature: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit agreement' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {message.text && (
        <div className={`message message-${message.type}`}>
          <FontAwesomeIcon icon={message.type === 'success' ? faCheck : faSpinner} />
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-section">
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

          <div className="checkbox-group">
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
    </div>
  );
};

export default FormPage;
