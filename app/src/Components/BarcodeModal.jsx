import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faDownload, 
  faPrint,
  faQrcode,
  faUser,
  faIdCard
} from '@fortawesome/free-solid-svg-icons';
import colors from '../utils/colors';

const BarcodeModal = ({ isOpen, onClose, rowNumber, name, workerId }) => {
  const printRef = useRef(null);
  
  if (!isOpen) return null;

  // Generate barcode URL using barcodeapi.org
  // Using QR code format with APF- prefix for easy identification
  const barcodeData = `APF-${rowNumber}`;
  const barcodeUrl = `https://barcodeapi.org/api/qr/${encodeURIComponent(barcodeData)}`;
  
  // Also generate a Code128 version (1D barcode) as alternative
  const barcode1DUrl = `https://barcodeapi.org/api/128/${encodeURIComponent(barcodeData)}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(barcodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcode-${name.replace(/\s+/g, '-')}-${rowNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(barcodeUrl, '_blank');
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .barcode-card {
            text-align: center;
            padding: 30px;
            border: 2px dashed #ccc;
            border-radius: 12px;
            max-width: 350px;
          }
          .barcode-img {
            width: 200px;
            height: 200px;
            margin-bottom: 20px;
          }
          .barcode-1d {
            width: 250px;
            height: 80px;
            margin-bottom: 20px;
          }
          .name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
          }
          .worker-id {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
          }
          .code {
            font-family: monospace;
            font-size: 18px;
            color: #333;
            background: #f5f5f5;
            padding: 8px 16px;
            border-radius: 4px;
          }
          @media print {
            body { padding: 0; }
            .barcode-card { border: 2px dashed #999; }
          }
        </style>
      </head>
      <body>
        <div class="barcode-card">
          <img src="${barcodeUrl}" alt="QR Code" class="barcode-img" />
          <div class="name">${name}</div>
          <div class="worker-id">Worker ID: ${workerId}</div>
          <div class="code">${barcodeData}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for image to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content barcode-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '450px' }}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            <FontAwesomeIcon icon={faQrcode} style={{ marginRight: '0.5rem' }} />
            Form Barcode Generated
          </h3>
          <button className="modal-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div ref={printRef} className="barcode-content">
            {/* QR Code */}
            <div className="barcode-qr-container">
              <img 
                src={barcodeUrl} 
                alt="QR Code" 
                className="barcode-qr-image"
              />
            </div>
            
            {/* Person Info */}
            <div className="barcode-info">
              <div className="barcode-name">
                <FontAwesomeIcon icon={faUser} style={{ marginRight: '0.5rem', color: colors.accentPink }} />
                {name}
              </div>
              <div className="barcode-worker-id">
                <FontAwesomeIcon icon={faIdCard} style={{ marginRight: '0.5rem' }} />
                Worker ID: {workerId}
              </div>
            </div>
            
            {/* Barcode Code */}
            <div className="barcode-code">
              {barcodeData}
            </div>
            
            {/* 1D Barcode Alternative */}
            <div className="barcode-1d-container">
              <p style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: '0.5rem' }}>
                Alternative (1D Barcode):
              </p>
              <img 
                src={barcode1DUrl} 
                alt="1D Barcode" 
                className="barcode-1d-image"
              />
            </div>
          </div>
          
          {/* Instructions */}
          <p style={{ 
            fontSize: '0.85rem', 
            color: colors.textSecondary, 
            marginTop: '1.5rem',
            marginBottom: '1rem',
            padding: '0.75rem',
            background: `rgba(230, 119, 179, 0.1)`,
            borderRadius: '8px'
          }}>
            Print or download this barcode. Scan it later to quickly load this form for signatures.
          </p>
          
          {/* Action Buttons */}
          <div className="barcode-actions">
            <button 
              className="btn btn-secondary"
              onClick={handleDownload}
            >
              <FontAwesomeIcon icon={faDownload} />
              Download
            </button>
            <button 
              className="btn btn-primary"
              onClick={handlePrint}
            >
              <FontAwesomeIcon icon={faPrint} />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeModal;
