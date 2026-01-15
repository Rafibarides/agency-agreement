import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileSignature, 
  faQrcode,
  faChartLine,
  faSpinner,
  faRefresh,
  faCopy,
  faCheck,
  faTimes,
  faExclamationTriangle,
  faUser,
  faIdCard,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { getStatistics, getAllAgreements } from '../utils/api';
import { getStaleDevices, isEsperConfigured, formatDeviceState } from '../utils/esperApi';
import colors from '../utils/colors';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAgreements: 0,
    esperIds: 0,
    lastSubmission: null
  });
  const [loading, setLoading] = useState(true);
  const [showEsperIds, setShowEsperIds] = useState(false);
  const [esperCodes, setEsperCodes] = useState([]);
  const [esperLoading, setEsperLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // Stale devices state
  const [staleDevicesData, setStaleDevicesData] = useState(null);
  const [staleLoading, setStaleLoading] = useState(false);
  const [showStaleList, setShowStaleList] = useState(false);
  const esperConfigured = isEsperConfigured();

  useEffect(() => {
    fetchStats();
    if (esperConfigured) {
      fetchStaleDevices();
    }
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const result = await getStatistics();
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaleDevices = async () => {
    setStaleLoading(true);
    try {
      const result = await getStaleDevices(5); // 5 months
      setStaleDevicesData(result);
    } catch (err) {
      console.error('Failed to fetch stale devices:', err);
    } finally {
      setStaleLoading(false);
    }
  };

  const fetchEsperIds = async () => {
    setEsperLoading(true);
    try {
      const result = await getAllAgreements();
      if (result.success && result.agreements) {
        const codes = result.agreements
          .filter(a => a['Esper Identifier Code'] && a['Esper Identifier Code'].toString().trim() !== '')
          .map(a => ({
            name: a.Name,
            code: a['Esper Identifier Code'],
            date: a.Timestamp
          }));
        setEsperCodes(codes);
      }
    } catch (err) {
      console.error('Failed to fetch Esper IDs:', err);
    } finally {
      setEsperLoading(false);
    }
  };

  const handleShowEsperIds = () => {
    setShowEsperIds(true);
    fetchEsperIds();
  };

  const copyToClipboard = async (code, index) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '1.75rem', 
          fontWeight: '600', 
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <FontAwesomeIcon icon={faChartLine} style={{ color: colors.accentPink }} />
          Dashboard
        </h1>
        <p style={{ color: colors.textMuted, fontSize: '0.9rem' }}>
          Overview of property agreement submissions
        </p>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          Loading statistics...
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalAgreements}</div>
              <div className="stat-label">
                <FontAwesomeIcon icon={faFileSignature} style={{ marginRight: '0.5rem' }} />
                Signed Agreements
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.esperIds}</div>
              <div className="stat-label">
                <FontAwesomeIcon icon={faQrcode} style={{ marginRight: '0.5rem' }} />
                Esper ID Codes
              </div>
            </div>
          </div>

          {/* Last Submission */}
          <div className="form-section" style={{ marginBottom: '2rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <span style={{ color: colors.textMuted, fontSize: '0.9rem' }}>Last Submission:</span>
                <span style={{ marginLeft: '0.75rem', fontWeight: '500' }}>
                  {formatDate(stats.lastSubmission)}
                </span>
              </div>
              <button 
                className="btn btn-secondary btn-small"
                onClick={fetchStats}
              >
                <FontAwesomeIcon icon={faRefresh} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stale Devices Panel */}
          {esperConfigured && (
            <div className="form-section" style={{ marginBottom: '2rem' }}>
              <h2 className="form-section-title" style={{ color: '#FFB74D' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                Inactive Devices
              </h2>
              
              {staleLoading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  Checking device activity...
                </div>
              ) : staleDevicesData ? (
                <>
                  {/* Alert Banner */}
                  <div style={{
                    padding: '1rem 1.25rem',
                    background: staleDevicesData.staleCount > 0 
                      ? 'rgba(255, 183, 77, 0.15)' 
                      : 'rgba(76, 175, 80, 0.15)',
                    border: `1px solid ${staleDevicesData.staleCount > 0 ? 'rgba(255, 183, 77, 0.4)' : 'rgba(76, 175, 80, 0.4)'}`,
                    borderRadius: '10px',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FontAwesomeIcon 
                          icon={staleDevicesData.staleCount > 0 ? faExclamationTriangle : faCheck} 
                          style={{ 
                            color: staleDevicesData.staleCount > 0 ? '#FFB74D' : '#81C784',
                            fontSize: '1.25rem'
                          }} 
                        />
                        <div>
                          <div style={{ 
                            fontWeight: 600, 
                            color: staleDevicesData.staleCount > 0 ? '#FFB74D' : '#81C784',
                            fontSize: '1.1rem'
                          }}>
                            {staleDevicesData.staleCount > 0 
                              ? `${staleDevicesData.staleCount} device${staleDevicesData.staleCount !== 1 ? 's' : ''} not used in 5+ months`
                              : 'All devices active'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: '0.2rem' }}>
                            Out of {staleDevicesData.totalDevices} total devices
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {staleDevicesData.staleCount > 0 && (
                          <button 
                            className="btn btn-secondary btn-small"
                            onClick={() => setShowStaleList(!showStaleList)}
                          >
                            {showStaleList ? (
                              <>
                                <FontAwesomeIcon icon={faTimes} />
                                Hide List
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faClock} />
                                View List
                              </>
                            )}
                          </button>
                        )}
                        <button 
                          className="btn btn-secondary btn-small btn-icon"
                          onClick={fetchStaleDevices}
                          title="Refresh"
                        >
                          <FontAwesomeIcon icon={faRefresh} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stale Devices List */}
                  {showStaleList && staleDevicesData.staleCount > 0 && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {staleDevicesData.staleDevices.map((device, index) => (
                        <div 
                          key={device.id || index}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            padding: '0.875rem 1rem',
                            background: 'rgba(255, 183, 77, 0.08)',
                            border: '1px solid rgba(255, 183, 77, 0.15)',
                            borderRadius: '8px',
                            marginBottom: '0.5rem'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              marginBottom: '0.35rem'
                            }}>
                              <FontAwesomeIcon icon={faUser} style={{ color: colors.textMuted, fontSize: '0.8rem' }} />
                              <span style={{ fontWeight: 600, color: colors.textPrimary }}>
                                {device.assignedTo || 'Unassigned'}
                              </span>
                              {device.title && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.4rem',
                                  background: 'rgba(230, 119, 179, 0.2)',
                                  borderRadius: '4px',
                                  color: colors.accentPink
                                }}>
                                  {device.title}
                                </span>
                              )}
                            </div>
                            
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '1rem',
                              fontSize: '0.85rem',
                              color: colors.textSecondary,
                              flexWrap: 'wrap'
                            }}>
                              {device.workerId && (
                                <span>
                                  <FontAwesomeIcon icon={faIdCard} style={{ marginRight: '0.3rem', fontSize: '0.75rem' }} />
                                  {device.workerId}
                                </span>
                              )}
                              <span style={{ fontFamily: 'monospace', color: colors.accentPink }}>
                                {device.deviceName?.match(/ESR-NNV-([A-Z0-9]+)$/i)?.[1] || device.serialNumber?.slice(0, 10) || 'Unknown'}
                              </span>
                              <span style={{ color: colors.textMuted }}>
                                {device.model || device.brand || ''}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ 
                            textAlign: 'right',
                            flexShrink: 0,
                            marginLeft: '1rem'
                          }}>
                            <div style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 600, 
                              color: '#FFB74D',
                              marginBottom: '0.2rem'
                            }}>
                              {device.daysSinceLastSeen 
                                ? `${device.daysSinceLastSeen} days ago`
                                : 'Never seen'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                              {device.lastSeenFormatted}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: colors.textMuted, textAlign: 'center' }}>
                  Unable to load device activity data.
                </p>
              )}
            </div>
          )}

          {/* Esper ID Codes Button & Modal */}
          <div className="form-section">
            <h2 className="form-section-title">
              <FontAwesomeIcon icon={faQrcode} />
              Esper Identifier Codes
            </h2>
            
            {!showEsperIds ? (
              <button 
                className="btn btn-primary"
                onClick={handleShowEsperIds}
                style={{ width: '100%' }}
              >
                <FontAwesomeIcon icon={faQrcode} />
                View All Esper ID Codes
              </button>
            ) : (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <span style={{ color: colors.textMuted, fontSize: '0.9rem' }}>
                    {esperCodes.length} Esper ID{esperCodes.length !== 1 ? 's' : ''} found
                  </span>
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowEsperIds(false)}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                    Close
                  </button>
                </div>

                {esperLoading ? (
                  <div className="loading">
                    <div className="spinner"></div>
                    Loading Esper IDs...
                  </div>
                ) : esperCodes.length === 0 ? (
                  <p style={{ color: colors.textMuted, textAlign: 'center', padding: '2rem' }}>
                    No Esper ID codes have been recorded yet.
                  </p>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {esperCodes.map((item, index) => (
                      <div 
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.875rem 1rem',
                          background: 'rgba(82, 70, 89, 0.3)',
                          borderRadius: '8px',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                            {item.name}
                          </div>
                          <div style={{ 
                            color: colors.accentPink, 
                            fontSize: '0.95rem',
                            fontFamily: 'monospace'
                          }}>
                            {item.code}
                          </div>
                          <div style={{ 
                            color: colors.textMuted, 
                            fontSize: '0.8rem',
                            marginTop: '0.25rem'
                          }}>
                            {formatDate(item.date)}
                          </div>
                        </div>
                        <button
                          className="btn btn-secondary btn-small btn-icon"
                          onClick={() => copyToClipboard(item.code, index)}
                          title="Copy to clipboard"
                        >
                          <FontAwesomeIcon icon={copiedId === index ? faCheck : faCopy} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

