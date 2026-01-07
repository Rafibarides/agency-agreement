import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPrint } from '@fortawesome/free-solid-svg-icons';
import { COMPANY_INFO } from '../utils/api';

const Preview = ({ agreement, onClose }) => {
  if (!agreement) return null;

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const getReceivedItems = () => {
    const items = [];
    if (agreement.Device) items.push(agreement['Device Name'] || 'Device');
    if (agreement['Portable Charger']) items.push('Portable Charger');
    if (agreement['Protective Cover']) items.push('Protective Cover');
    if (agreement['Keyboard/Accessory']) items.push('Keyboard/Accessory');
    return items;
  };

  const renderSignature = (svgPath) => {
    if (!svgPath || svgPath.trim() === '') return null;
    
    return (
      <svg 
        viewBox="0 0 400 120" 
        className="pdf-signature-svg"
        style={{ background: 'transparent' }}
      >
        <path 
          d={svgPath} 
          stroke="#000000" 
          strokeWidth="2" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const receivedItems = getReceivedItems();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header no-print">
          <h3 className="modal-title">Property Agreement Document</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-small" onClick={handlePrint}>
              <FontAwesomeIcon icon={faPrint} />
              Print
            </button>
            <button className="modal-close" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div className="pdf-preview">
            {/* Header */}
            <div className="pdf-header">
              <img src={`${import.meta.env.BASE_URL}logoblack.png`} alt="Wellbound Logo" className="pdf-logo" />
              <h1 className="pdf-title">PROPERTY AGREEMENT FORM</h1>
              <div className="pdf-company">
                {COMPANY_INFO.name}<br />
                {COMPANY_INFO.address}<br />
                {COMPANY_INFO.city}<br />
                {COMPANY_INFO.phone}
              </div>
            </div>

            {/* Personal Information */}
            <div className="pdf-field">
              <span className="pdf-field-label">Name:</span> {agreement.Name || ''}
            </div>
            <div className="pdf-field">
              <span className="pdf-field-label">Title:</span> {agreement.Title || ''}
            </div>
            <div className="pdf-field">
              <span className="pdf-field-label">Worker ID:</span> {agreement['Worker ID'] || ''}
            </div>
            {agreement['Has Different Training ID'] && (
              <div className="pdf-field">
                <span className="pdf-field-label">Training Worker ID:</span> {agreement['Training Worker ID'] || ''}
              </div>
            )}

            {/* Received Property */}
            <h3 className="pdf-section-title">Acknowledgement of Received Property</h3>
            {receivedItems.length > 0 ? (
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                {receivedItems.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#333' }}>No items recorded</p>
            )}

            {agreement['Serial Number'] && (
              <div className="pdf-field">
                <span className="pdf-field-label">Serial Number:</span> {agreement['Serial Number']}
              </div>
            )}
            {agreement['Esper Identifier Code'] && (
              <div className="pdf-field">
                <span className="pdf-field-label">Esper Identifier Code:</span> {agreement['Esper Identifier Code']}
              </div>
            )}

            {/* Exchange Information */}
            {agreement['Exchange Device'] && (
              <>
                <h3 className="pdf-section-title">Device Exchange</h3>
                <div className="pdf-field">
                  <span className="pdf-field-label">Returning Device:</span> {agreement['Returning Device Name'] || ''}
                </div>
                <div className="pdf-field">
                  <span className="pdf-field-label">Returning Serial:</span> {agreement['Returning Serial Number'] || ''}
                </div>
              </>
            )}

            {/* Agreements */}
            <h3 className="pdf-section-title">Agreements</h3>
            <div className="pdf-agreement-item">
              I agree to maintain all Agency property in working condition, and to notify the Agency in the event that the property malfunctions in any way, or if the property is lost or stolen.
            </div>
            <div className="pdf-agreement-item">
              If there are any items which I do not need, these will be returned immediately to my Supervisor.
            </div>
            <div className="pdf-agreement-item">
              I have been advised by my Supervisor / Human Resources, that it is my responsibility to return all property to the Agency upon termination of the engagement between myself and the Agency.
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
              <div className="pdf-signature-box">
                <div className="pdf-signature-title">Employee Signature</div>
                {renderSignature(agreement['Employee Signature'])}
                <div style={{ fontSize: '0.875rem', color: '#000', marginTop: '0.5rem' }}>
                  Date: {formatDate(agreement['Employee Signature Date'])}
                </div>
              </div>
              <div className="pdf-signature-box">
                <div className="pdf-signature-title">Supervisor Signature</div>
                {renderSignature(agreement['Supervisor Signature'])}
                <div style={{ fontSize: '0.875rem', color: '#000', marginTop: '0.5rem' }}>
                  Date: {formatDate(agreement['Supervisor Signature Date'])}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#333' }}>
              Generated on {formatDate(new Date())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;

