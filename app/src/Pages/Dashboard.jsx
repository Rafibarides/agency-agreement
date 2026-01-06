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
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { getStatistics, getAllAgreements } from '../utils/api';
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

  useEffect(() => {
    fetchStats();
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

