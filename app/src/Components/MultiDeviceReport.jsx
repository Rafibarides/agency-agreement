import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt,
  faSpinner,
  faDownload,
  faTimes,
  faExclamationTriangle,
  faUsers,
  faTabletAlt,
  faSync,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { jsPDF } from 'jspdf';
import { getMultipleDevicesReport, formatDeviceState, isEsperConfigured } from '../utils/esperApi';
import { COMPANY_INFO } from '../utils/api';
import colors from '../utils/colors';

const MultiDeviceReport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [expandedPerson, setExpandedPerson] = useState(null);

  const handleGenerateReport = async () => {
    if (!isEsperConfigured()) {
      setError('Esper API is not configured');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);

    try {
      const data = await getMultipleDevicesReport();
      setReportData(data);
      setIsOpen(true);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const generatePDF = async () => {
    if (!reportData || reportData.people.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Helper to add new page if needed
    const checkPageBreak = (height) => {
      if (yPosition + height > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Header with company info
    doc.setFillColor(62, 14, 48); // Dark purple
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Company name
    doc.setTextColor(230, 119, 179); // Accent pink
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name, pageWidth / 2, 18, { align: 'center' });
    
    // Report title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('Multiple Devices Report', pageWidth / 2, 30, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${formatDate(reportData.generatedAt)}`, pageWidth / 2, 40, { align: 'center' });

    yPosition = 55;

    // Summary box
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), 25, 3, 3, 'F');
    
    doc.setTextColor(62, 14, 48);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Summary`, margin + 5, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Devices in System: ${reportData.totalDevices}`, margin + 5, yPosition + 16);
    doc.text(`Staff with Multiple Devices: ${reportData.totalPeopleWithMultiple}`, margin + 80, yPosition + 16);
    
    const totalMultipleDevices = reportData.people.reduce((sum, p) => sum + p.devices.length, 0);
    doc.text(`Total Devices Held by Multi-Device Staff: ${totalMultipleDevices}`, margin + 5, yPosition + 22);

    yPosition += 35;

    // Staff list
    for (const person of reportData.people) {
      checkPageBreak(50);

      // Person header
      doc.setFillColor(230, 119, 179);
      doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), 12, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${person.name}`, margin + 5, yPosition + 8);
      
      const titleText = person.title ? ` (${person.title})` : '';
      const idText = person.workerId ? `Worker ID: ${person.workerId}` : '';
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${person.devices.length} devices${titleText}`, margin + 80, yPosition + 8);
      if (idText) {
        doc.text(idText, pageWidth - margin - 40, yPosition + 8);
      }

      yPosition += 16;

      // Device table header
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Device', margin + 3, yPosition + 5.5);
      doc.text('Serial Number', margin + 50, yPosition + 5.5);
      doc.text('Model', margin + 95, yPosition + 5.5);
      doc.text('State', margin + 130, yPosition + 5.5);
      doc.text('Provisioned', margin + 155, yPosition + 5.5);

      yPosition += 10;

      // Device rows
      for (const device of person.devices) {
        checkPageBreak(8);
        
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        // Extract Esper code from device name
        const esperCode = device.deviceName?.match(/ESR-NNV-([A-Z0-9]+)$/i)?.[1] || device.deviceName?.slice(-10) || 'N/A';
        doc.text(esperCode, margin + 3, yPosition + 4);
        doc.text(device.serialNumber?.slice(0, 15) || 'N/A', margin + 50, yPosition + 4);
        doc.text(device.model?.slice(0, 12) || device.brand || 'N/A', margin + 95, yPosition + 4);
        
        const state = formatDeviceState(device.state);
        doc.setTextColor(device.state === 1 ? 0 : 150, device.state === 1 ? 128 : 50, device.state === 1 ? 0 : 50);
        doc.text(state.slice(0, 10), margin + 130, yPosition + 4);
        
        doc.setTextColor(50, 50, 50);
        doc.text(formatDate(device.provisionedDate), margin + 155, yPosition + 4);

        yPosition += 7;
      }

      yPosition += 8;
    }

    // Footer on last page
    const footerY = pageHeight - 15;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text(`${COMPANY_INFO.address}, ${COMPANY_INFO.city}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text(COMPANY_INFO.phone, pageWidth / 2, footerY + 5, { align: 'center' });

    // Save PDF
    const fileName = `Multiple_Devices_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const togglePersonExpand = (identifier) => {
    setExpandedPerson(expandedPerson === identifier ? null : identifier);
  };

  if (!isEsperConfigured()) {
    return null;
  }

  return (
    <div className="multi-device-report">
      {/* Trigger Button */}
      <button
        className="btn btn-secondary"
        onClick={handleGenerateReport}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        {loading ? (
          <>
            <FontAwesomeIcon icon={faSpinner} spin />
            Generating Report...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faFileAlt} />
            Multi-Device Report
          </>
        )}
      </button>

      {/* Report Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div 
            className="report-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="report-modal-header">
              <div>
                <h3>
                  <FontAwesomeIcon icon={faUsers} style={{ marginRight: '0.5rem' }} />
                  Staff with Multiple Devices
                </h3>
                {reportData && (
                  <p className="report-subtitle">
                    {reportData.totalPeopleWithMultiple} staff member{reportData.totalPeopleWithMultiple !== 1 ? 's' : ''} with 2+ devices
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={handleGenerateReport}
                  disabled={loading}
                  title="Refresh"
                >
                  <FontAwesomeIcon icon={faSync} spin={loading} />
                </button>
                <button className="modal-close" onClick={() => setIsOpen(false)}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="report-modal-content">
              {error && (
                <div className="report-error">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  {error}
                </div>
              )}

              {loading && (
                <div className="report-loading">
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                  <p>Fetching devices from Esper...</p>
                  <p className="report-loading-sub">This may take a moment</p>
                </div>
              )}

              {!loading && reportData && reportData.people.length === 0 && (
                <div className="report-empty">
                  <FontAwesomeIcon icon={faTabletAlt} size="2x" />
                  <p>No staff members with multiple devices found.</p>
                </div>
              )}

              {!loading && reportData && reportData.people.length > 0 && (
                <>
                  {/* Summary Stats */}
                  <div className="report-summary">
                    <div className="report-stat">
                      <span className="report-stat-value">{reportData.totalDevices}</span>
                      <span className="report-stat-label">Total Devices</span>
                    </div>
                    <div className="report-stat">
                      <span className="report-stat-value">{reportData.totalPeopleWithMultiple}</span>
                      <span className="report-stat-label">Multi-Device Staff</span>
                    </div>
                    <div className="report-stat">
                      <span className="report-stat-value">
                        {reportData.people.reduce((sum, p) => sum + p.devices.length, 0)}
                      </span>
                      <span className="report-stat-label">Devices Held</span>
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="report-list">
                    {reportData.people.map((person) => (
                      <div key={person.identifier} className="report-person">
                        <div 
                          className="report-person-header"
                          onClick={() => togglePersonExpand(person.identifier)}
                        >
                          <div className="report-person-info">
                            <span className="report-person-name">{person.name}</span>
                            {person.title && (
                              <span className="report-person-title">{person.title}</span>
                            )}
                            {person.workerId && (
                              <span className="report-person-id">ID: {person.workerId}</span>
                            )}
                          </div>
                          <div className="report-person-count">
                            <span className="device-count-badge">{person.devices.length} devices</span>
                            <FontAwesomeIcon 
                              icon={expandedPerson === person.identifier ? faChevronUp : faChevronDown}
                              className="expand-icon"
                            />
                          </div>
                        </div>
                        
                        {expandedPerson === person.identifier && (
                          <div className="report-devices-table">
                            <table>
                              <thead>
                                <tr>
                                  <th>Device</th>
                                  <th>Serial</th>
                                  <th>Model</th>
                                  <th>State</th>
                                  <th>Provisioned</th>
                                </tr>
                              </thead>
                              <tbody>
                                {person.devices.map((device, idx) => (
                                  <tr key={device.id || idx}>
                                    <td>
                                      {device.deviceName?.match(/ESR-NNV-([A-Z0-9]+)$/i)?.[1] || 
                                       device.deviceName?.slice(-10) || 'N/A'}
                                    </td>
                                    <td>{device.serialNumber?.slice(0, 12) || 'N/A'}</td>
                                    <td>{device.model || device.brand || 'N/A'}</td>
                                    <td>
                                      <span className={`state-badge state-${device.state === 1 ? 'active' : 'inactive'}`}>
                                        {formatDeviceState(device.state)}
                                      </span>
                                    </td>
                                    <td>{formatDate(device.provisionedDate)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer with Download */}
            {reportData && reportData.people.length > 0 && (
              <div className="report-modal-footer">
                <span className="report-generated">
                  Generated: {formatDate(reportData.generatedAt)}
                </span>
                <button
                  className="btn btn-primary"
                  onClick={generatePDF}
                >
                  <FontAwesomeIcon icon={faDownload} />
                  Download PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiDeviceReport;
