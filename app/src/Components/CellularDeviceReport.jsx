import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignal,
  faSpinner,
  faDownload,
  faTimes,
  faExclamationTriangle,
  faWifi,
  faSatelliteDish,
  faSync,
  faUser,
  faIdCard,
  faCopy,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { jsPDF } from 'jspdf';
import { getCellularDeviceReport, formatDeviceState, isEsperConfigured } from '../utils/esperApi';
import { COMPANY_INFO } from '../utils/api';
import colors from '../utils/colors';

const CellularDeviceReport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState('cellular'); // 'cellular' or 'wifi'
  const [copiedSerial, setCopiedSerial] = useState(null);

  const handleGenerateReport = async () => {
    if (!isEsperConfigured()) {
      setError('Esper API is not configured');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);

    try {
      const data = await getCellularDeviceReport();
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

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSerial(index);
      setTimeout(() => setCopiedSerial(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getConnectivityBadgeStyle = (type) => {
    switch (type) {
      case '5G':
        return { background: 'rgba(156, 39, 176, 0.2)', color: '#CE93D8', border: '1px solid rgba(156, 39, 176, 0.4)' };
      case 'LTE':
        return { background: 'rgba(33, 150, 243, 0.2)', color: '#64B5F6', border: '1px solid rgba(33, 150, 243, 0.4)' };
      case 'Cellular':
        return { background: 'rgba(255, 152, 0, 0.2)', color: '#FFB74D', border: '1px solid rgba(255, 152, 0, 0.4)' };
      default:
        return { background: 'rgba(76, 175, 80, 0.2)', color: '#81C784', border: '1px solid rgba(76, 175, 80, 0.4)' };
    }
  };

  const generatePDF = async () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    const checkPageBreak = (height) => {
      if (yPosition + height > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // Header
    doc.setFillColor(62, 14, 48);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(230, 119, 179);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_INFO.name, pageWidth / 2, 15, { align: 'center' });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('Cellular vs WiFi Device Report', pageWidth / 2, 26, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${formatDate(reportData.generatedAt)}`, pageWidth / 2, 35, { align: 'center' });

    yPosition = 50;

    // Summary box
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), 30, 3, 3, 'F');
    
    doc.setTextColor(62, 14, 48);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin + 5, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total Devices: ${reportData.totalDevices}`, margin + 5, yPosition + 16);
    doc.text(`Cellular/5G/LTE: ${reportData.cellularCount}`, margin + 60, yPosition + 16);
    doc.text(`WiFi Only: ${reportData.wifiCount}`, margin + 115, yPosition + 16);
    
    if (reportData.fiveGCount > 0 || reportData.lteCount > 0) {
      doc.text(`5G: ${reportData.fiveGCount} | LTE: ${reportData.lteCount} | Other Cellular: ${reportData.genericCellularCount}`, margin + 5, yPosition + 24);
    }

    yPosition += 40;

    // CELLULAR DEVICES SECTION
    doc.setFillColor(156, 39, 176);
    doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`CELLULAR / 5G / LTE DEVICES (${reportData.cellularCount})`, margin + 5, yPosition + 7);
    yPosition += 15;

    if (reportData.cellularDevices.length > 0) {
      // Table header
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('ASSIGNED TO', margin + 2, yPosition + 5.5);
      doc.text('TITLE', margin + 45, yPosition + 5.5);
      doc.text('DEVICE', margin + 62, yPosition + 5.5);
      doc.text('SERIAL', margin + 90, yPosition + 5.5);
      doc.text('TYPE', margin + 125, yPosition + 5.5);
      doc.text('IMEI', margin + 145, yPosition + 5.5);
      yPosition += 10;

      for (const device of reportData.cellularDevices) {
        checkPageBreak(8);
        
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        
        const assignedTo = device.assignedTo || 'Unassigned';
        doc.text(assignedTo.slice(0, 25), margin + 2, yPosition + 4);
        doc.text((device.title || '-').slice(0, 8), margin + 45, yPosition + 4);
        
        const esperCode = device.deviceName?.match(/ESR-NNV-([A-Z0-9]+)$/i)?.[1] || '-';
        doc.text(esperCode.slice(0, 12), margin + 62, yPosition + 4);
        doc.text((device.serialNumber || '-').slice(0, 15), margin + 90, yPosition + 4);
        
        // Connectivity type with color
        const connType = device.connectivityType;
        if (connType === '5G') doc.setTextColor(156, 39, 176);
        else if (connType === 'LTE') doc.setTextColor(33, 150, 243);
        else doc.setTextColor(255, 152, 0);
        doc.text(connType, margin + 125, yPosition + 4);
        
        doc.setTextColor(50, 50, 50);
        doc.text((device.imei || '-').slice(0, 15), margin + 145, yPosition + 4);

        yPosition += 6;
      }
    } else {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text('No cellular devices found', margin + 5, yPosition + 5);
      yPosition += 10;
    }

    yPosition += 10;
    checkPageBreak(50);

    // WIFI DEVICES SECTION  
    doc.setFillColor(76, 175, 80);
    doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`WIFI-ONLY DEVICES (${reportData.wifiCount})`, margin + 5, yPosition + 7);
    yPosition += 15;

    if (reportData.wifiDevices.length > 0) {
      // Table header
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('ASSIGNED TO', margin + 2, yPosition + 5.5);
      doc.text('TITLE', margin + 50, yPosition + 5.5);
      doc.text('DEVICE', margin + 70, yPosition + 5.5);
      doc.text('SERIAL', margin + 100, yPosition + 5.5);
      doc.text('MODEL', margin + 140, yPosition + 5.5);
      yPosition += 10;

      for (const device of reportData.wifiDevices) {
        checkPageBreak(8);
        
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        
        const assignedTo = device.assignedTo || 'Unassigned';
        doc.text(assignedTo.slice(0, 28), margin + 2, yPosition + 4);
        doc.text((device.title || '-').slice(0, 10), margin + 50, yPosition + 4);
        
        const esperCode = device.deviceName?.match(/ESR-NNV-([A-Z0-9]+)$/i)?.[1] || '-';
        doc.text(esperCode.slice(0, 12), margin + 70, yPosition + 4);
        doc.text((device.serialNumber || '-').slice(0, 18), margin + 100, yPosition + 4);
        doc.text((device.model || device.brand || '-').slice(0, 15), margin + 140, yPosition + 4);

        yPosition += 6;
      }
    } else {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text('No WiFi-only devices found', margin + 5, yPosition + 5);
    }

    // Footer
    const footerY = pageHeight - 12;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text(`${COMPANY_INFO.address}, ${COMPANY_INFO.city} | ${COMPANY_INFO.phone}`, pageWidth / 2, footerY, { align: 'center' });

    const fileName = `Cellular_Device_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const currentDevices = activeTab === 'cellular' ? reportData?.cellularDevices : reportData?.wifiDevices;

  if (!isEsperConfigured()) {
    return null;
  }

  return (
    <div className="cellular-device-report">
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
            Loading Devices...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faSignal} />
            5G/Cellular Report
          </>
        )}
      </button>

      {/* Report Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div 
            className="report-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '900px' }}
          >
            {/* Header */}
            <div className="report-modal-header">
              <div>
                <h3>
                  <FontAwesomeIcon icon={faSatelliteDish} style={{ marginRight: '0.5rem' }} />
                  Cellular vs WiFi Device Report
                </h3>
                {reportData && (
                  <p className="report-subtitle">
                    {reportData.cellularCount} cellular/5G device{reportData.cellularCount !== 1 ? 's' : ''} • {reportData.wifiCount} WiFi-only
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
                  <p className="report-loading-sub">Analyzing connectivity types</p>
                </div>
              )}

              {!loading && reportData && (
                <>
                  {/* Summary Stats */}
                  <div className="report-summary" style={{ marginBottom: '1.5rem' }}>
                    <div className="report-stat">
                      <span className="report-stat-value">{reportData.totalDevices}</span>
                      <span className="report-stat-label">Total Devices</span>
                    </div>
                    <div className="report-stat" style={{ background: 'rgba(156, 39, 176, 0.15)', border: '1px solid rgba(156, 39, 176, 0.3)' }}>
                      <span className="report-stat-value" style={{ color: '#CE93D8' }}>{reportData.cellularCount}</span>
                      <span className="report-stat-label">Cellular/5G/LTE</span>
                    </div>
                    <div className="report-stat" style={{ background: 'rgba(76, 175, 80, 0.15)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                      <span className="report-stat-value" style={{ color: '#81C784' }}>{reportData.wifiCount}</span>
                      <span className="report-stat-label">WiFi Only</span>
                    </div>
                  </div>

                  {/* Breakdown if there are different cellular types */}
                  {(reportData.fiveGCount > 0 || reportData.lteCount > 0) && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      marginBottom: '1.5rem',
                      justifyContent: 'center',
                      flexWrap: 'wrap'
                    }}>
                      {reportData.fiveGCount > 0 && (
                        <div style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(156, 39, 176, 0.15)',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          color: '#CE93D8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <FontAwesomeIcon icon={faSignal} />
                          <strong>{reportData.fiveGCount}</strong> 5G
                        </div>
                      )}
                      {reportData.lteCount > 0 && (
                        <div style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(33, 150, 243, 0.15)',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          color: '#64B5F6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <FontAwesomeIcon icon={faSignal} />
                          <strong>{reportData.lteCount}</strong> LTE
                        </div>
                      )}
                      {reportData.genericCellularCount > 0 && (
                        <div style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(255, 152, 0, 0.15)',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          color: '#FFB74D',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <FontAwesomeIcon icon={faSignal} />
                          <strong>{reportData.genericCellularCount}</strong> Cellular
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      className={`btn ${activeTab === 'cellular' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActiveTab('cellular')}
                      style={{ flex: 1 }}
                    >
                      <FontAwesomeIcon icon={faSignal} />
                      Cellular / 5G / LTE ({reportData.cellularCount})
                    </button>
                    <button
                      className={`btn ${activeTab === 'wifi' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setActiveTab('wifi')}
                      style={{ flex: 1 }}
                    >
                      <FontAwesomeIcon icon={faWifi} />
                      WiFi Only ({reportData.wifiCount})
                    </button>
                  </div>

                  {/* Device Table */}
                  {currentDevices && currentDevices.length > 0 ? (
                    <div className="data-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ minWidth: '700px' }}>
                        <thead>
                          <tr>
                            <th>Assigned To</th>
                            <th>Title</th>
                            <th>Device</th>
                            <th>Serial</th>
                            {activeTab === 'cellular' && <th>Type</th>}
                            {activeTab === 'cellular' && <th>IMEI</th>}
                            <th>State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentDevices.map((device, index) => (
                            <tr key={device.id || index}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <FontAwesomeIcon icon={faUser} style={{ color: colors.textMuted, fontSize: '0.8rem' }} />
                                  <span style={{ fontWeight: 500 }}>{device.assignedTo || 'Unassigned'}</span>
                                </div>
                                {device.workerId && (
                                  <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '0.2rem' }}>
                                    <FontAwesomeIcon icon={faIdCard} style={{ marginRight: '0.3rem' }} />
                                    {device.workerId}
                                  </div>
                                )}
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>{device.title || '-'}</td>
                              <td>
                                <span style={{ fontFamily: 'monospace', color: colors.accentPink }}>
                                  {device.deviceName?.match(/ESR-NNV-([A-Z0-9]+)$/i)?.[1] || device.deviceName?.slice(-8) || '-'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                    {device.serialNumber?.slice(0, 12) || '-'}
                                  </span>
                                  {device.serialNumber && (
                                    <button
                                      className="copy-btn"
                                      onClick={() => copyToClipboard(device.serialNumber, `${activeTab}-${index}`)}
                                      title="Copy serial"
                                    >
                                      <FontAwesomeIcon 
                                        icon={copiedSerial === `${activeTab}-${index}` ? faCheck : faCopy} 
                                        style={{ fontSize: '0.7rem' }}
                                      />
                                    </button>
                                  )}
                                </div>
                              </td>
                              {activeTab === 'cellular' && (
                                <td>
                                  <span style={{
                                    ...getConnectivityBadgeStyle(device.connectivityType),
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}>
                                    {device.connectivityType}
                                  </span>
                                </td>
                              )}
                              {activeTab === 'cellular' && (
                                <td style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: colors.textMuted }}>
                                  {device.imei?.slice(0, 15) || '-'}
                                </td>
                              )}
                              <td>
                                <span className={`state-badge state-${device.state === 1 ? 'active' : 'inactive'}`}>
                                  {formatDeviceState(device.state)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="report-empty">
                      <FontAwesomeIcon icon={activeTab === 'cellular' ? faSignal : faWifi} size="2x" />
                      <p>No {activeTab === 'cellular' ? 'cellular/5G' : 'WiFi-only'} devices found.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer with Download */}
            {reportData && (
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

export default CellularDeviceReport;
