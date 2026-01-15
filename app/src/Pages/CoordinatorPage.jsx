import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsersCog,
  faSignOutAlt,
  faUser,
  faExclamationCircle,
  faClock,
  faUsers,
  faTabletAlt,
  faSpinner,
  faSync,
  faChevronDown,
  faChevronUp,
  faIdCard,
  faSearch,
  faTimes,
  faArrowLeft,
  faMobileAlt,
  faBoxOpen
} from '@fortawesome/free-solid-svg-icons';
import { getDueForReturnDevices } from '../utils/api';
import { 
  getStaleDevices, 
  getMultipleDevicesReport, 
  getDevicesByPractice,
  getPointCareForDevices,
  formatDeviceState,
  isEsperConfigured 
} from '../utils/esperApi';
import colors from '../utils/colors';

const CoordinatorPage = ({ userEmail, onLogout, onOpenRetrieval }) => {
  // Due for return state
  const [dueForReturn, setDueForReturn] = useState([]);
  const [dueLoading, setDueLoading] = useState(true);
  
  // Stale devices state
  const [staleData, setStaleData] = useState(null);
  const [staleLoading, setStaleLoading] = useState(true);
  const [showStaleList, setShowStaleList] = useState(false);
  
  // Multi-device state
  const [multiDeviceData, setMultiDeviceData] = useState(null);
  const [multiLoading, setMultiLoading] = useState(true);
  const [expandedPerson, setExpandedPerson] = useState(null);
  
  // Practice stats state
  const [practiceData, setPracticeData] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(true);
  const [selectedPractice, setSelectedPractice] = useState(null);
  const [practiceSearch, setPracticeSearch] = useState('');
  const [loadingPointCare, setLoadingPointCare] = useState(false);
  const [pointCareData, setPointCareData] = useState({});
  
  const esperConfigured = isEsperConfigured();

  useEffect(() => {
    fetchDueForReturn();
    if (esperConfigured) {
      fetchStaleDevices();
      fetchMultiDeviceData();
      fetchPracticeData();
    }
  }, []);

  const fetchDueForReturn = async () => {
    setDueLoading(true);
    try {
      const result = await getDueForReturnDevices();
      if (result.success) {
        setDueForReturn(result.devices || []);
      }
    } catch (err) {
      console.error('Failed to fetch due for return:', err);
    } finally {
      setDueLoading(false);
    }
  };

  const fetchStaleDevices = async () => {
    setStaleLoading(true);
    try {
      const result = await getStaleDevices(5);
      setStaleData(result);
    } catch (err) {
      console.error('Failed to fetch stale devices:', err);
    } finally {
      setStaleLoading(false);
    }
  };

  const fetchMultiDeviceData = async () => {
    setMultiLoading(true);
    try {
      const result = await getMultipleDevicesReport();
      setMultiDeviceData(result);
    } catch (err) {
      console.error('Failed to fetch multi-device data:', err);
    } finally {
      setMultiLoading(false);
    }
  };

  const fetchPracticeData = async () => {
    setPracticeLoading(true);
    try {
      const result = await getDevicesByPractice();
      setPracticeData(result);
    } catch (err) {
      console.error('Failed to fetch practice data:', err);
    } finally {
      setPracticeLoading(false);
    }
  };

  const handlePracticeClick = async (practice) => {
    setSelectedPractice(practice);
    setPracticeSearch('');
    
    // Load PointCare info for devices in this practice
    setLoadingPointCare(true);
    try {
      const deviceIds = practice.devices.map(d => d.id).filter(Boolean);
      const pcData = await getPointCareForDevices(deviceIds);
      setPointCareData(prev => ({ ...prev, ...pcData }));
    } catch (err) {
      console.error('Failed to load PointCare data:', err);
    } finally {
      setLoadingPointCare(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredPracticeDevices = selectedPractice?.devices.filter(device => {
    if (!practiceSearch) return true;
    const search = practiceSearch.toLowerCase();
    return (
      device.assignedTo?.toLowerCase().includes(search) ||
      device.workerId?.toLowerCase().includes(search) ||
      device.serialNumber?.toLowerCase().includes(search)
    );
  }) || [];

  const getPracticeColor = (abbrev) => {
    const colorMap = {
      'RN': '#E57373',
      'LPN': '#FFB74D',
      'PT': '#64B5F6',
      'PTA': '#81C784',
      'OT': '#BA68C8',
      'COTA': '#4DD0E1',
      'ST': '#F06292'
    };
    return colorMap[abbrev] || colors.accentPink;
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.15), rgba(100, 181, 246, 0.05))',
        borderRadius: '12px',
        border: '1px solid rgba(100, 181, 246, 0.3)'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#64B5F6'
          }}>
            <FontAwesomeIcon icon={faUsersCog} />
            Coordinator Console
          </h1>
          <p style={{ 
            color: colors.textMuted, 
            fontSize: '0.85rem', 
            margin: '0.35rem 0 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FontAwesomeIcon icon={faUser} style={{ fontSize: '0.75rem' }} />
            {userEmail}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onOpenRetrieval}
            className="btn btn-retrieval btn-small"
          >
            <FontAwesomeIcon icon={faBoxOpen} />
            Retrieval Program
          </button>
          <button
            onClick={onLogout}
            className="btn btn-secondary btn-small"
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Due for Return Panel */}
      <div className="form-section" style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h2 className="form-section-title" style={{ margin: 0, color: '#E57373' }}>
            <FontAwesomeIcon icon={faExclamationCircle} />
            Devices Due for Return
          </h2>
          <button 
            className="btn btn-secondary btn-small btn-icon"
            onClick={fetchDueForReturn}
            disabled={dueLoading}
          >
            <FontAwesomeIcon icon={faSync} spin={dueLoading} />
          </button>
        </div>

        {dueLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            Loading...
          </div>
        ) : dueForReturn.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: colors.textMuted 
          }}>
            <FontAwesomeIcon icon={faExclamationCircle} style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.5 }} />
            <p>No devices currently marked for return.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {dueForReturn.map((device, index) => (
              <div 
                key={device.rowNumber || index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.875rem 1rem',
                  background: 'rgba(229, 115, 115, 0.1)',
                  border: '1px solid rgba(229, 115, 115, 0.2)',
                  borderRadius: '8px',
                  marginBottom: '0.5rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '0.25rem' }}>
                    {device.Name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: colors.textSecondary }}>
                    {device.Title?.split('–')[0].trim() || '-'} • ID: {device['Worker ID'] || '-'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: colors.accentPink, fontFamily: 'monospace' }}>
                    {device['Esper Identifier Code'] || device['Serial Number']?.slice(0, 10) || '-'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                    {formatDate(device.Timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {dueForReturn.length > 0 && (
          <div style={{ 
            marginTop: '0.75rem', 
            fontSize: '0.8rem', 
            color: colors.textMuted, 
            textAlign: 'center' 
          }}>
            {dueForReturn.length} device{dueForReturn.length !== 1 ? 's' : ''} pending retrieval
          </div>
        )}
      </div>

      {/* Two Column Layout for Stale and Multi-Device */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Stale Devices Panel */}
        <div className="form-section" style={{ flex: '1 1 300px', minWidth: '280px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 className="form-section-title" style={{ margin: 0, color: '#FFB74D', fontSize: '1rem' }}>
              <FontAwesomeIcon icon={faClock} />
              Inactive 5+ Months
            </h2>
            <button 
              className="btn btn-secondary btn-small btn-icon"
              onClick={fetchStaleDevices}
              disabled={staleLoading}
            >
              <FontAwesomeIcon icon={faSync} spin={staleLoading} />
            </button>
          </div>

          {staleLoading ? (
            <div className="loading" style={{ padding: '1.5rem' }}>
              <div className="spinner"></div>
            </div>
          ) : staleData ? (
            <>
              <div style={{
                padding: '1rem',
                background: staleData.staleCount > 0 ? 'rgba(255, 183, 77, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: showStaleList ? '1rem' : 0
              }}>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: 700, 
                  color: staleData.staleCount > 0 ? '#FFB74D' : '#81C784'
                }}>
                  {staleData.staleCount}
                </div>
                <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                  devices not seen in 5+ months
                </div>
                {staleData.staleCount > 0 && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowStaleList(!showStaleList)}
                    style={{ marginTop: '0.75rem' }}
                  >
                    <FontAwesomeIcon icon={showStaleList ? faChevronUp : faChevronDown} />
                    {showStaleList ? 'Hide' : 'View'} List
                  </button>
                )}
              </div>

              {showStaleList && staleData.staleDevices?.length > 0 && (
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {staleData.staleDevices.slice(0, 20).map((device, index) => (
                    <div 
                      key={device.id || index}
                      style={{
                        padding: '0.6rem 0.75rem',
                        background: 'rgba(255, 183, 77, 0.05)',
                        borderRadius: '6px',
                        marginBottom: '0.4rem',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 500, color: colors.textPrimary }}>
                        {device.assignedTo || 'Unassigned'}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: colors.textMuted,
                        marginTop: '0.2rem'
                      }}>
                        <span>{device.title || '-'}</span>
                        <span style={{ color: '#FFB74D' }}>
                          {device.daysSinceLastSeen ? `${device.daysSinceLastSeen}d ago` : 'Never'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: colors.textMuted, textAlign: 'center' }}>Unable to load</p>
          )}
        </div>

        {/* Multi-Device Panel */}
        <div className="form-section" style={{ flex: '1 1 300px', minWidth: '280px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 className="form-section-title" style={{ margin: 0, color: '#BA68C8', fontSize: '1rem' }}>
              <FontAwesomeIcon icon={faUsers} />
              Multiple Devices
            </h2>
            <button 
              className="btn btn-secondary btn-small btn-icon"
              onClick={fetchMultiDeviceData}
              disabled={multiLoading}
            >
              <FontAwesomeIcon icon={faSync} spin={multiLoading} />
            </button>
          </div>

          {multiLoading ? (
            <div className="loading" style={{ padding: '1.5rem' }}>
              <div className="spinner"></div>
            </div>
          ) : multiDeviceData ? (
            <>
              <div style={{
                padding: '1rem',
                background: multiDeviceData.totalPeopleWithMultiple > 0 ? 'rgba(186, 104, 200, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: multiDeviceData.totalPeopleWithMultiple > 0 ? '1rem' : 0
              }}>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: 700, 
                  color: multiDeviceData.totalPeopleWithMultiple > 0 ? '#BA68C8' : '#81C784'
                }}>
                  {multiDeviceData.totalPeopleWithMultiple}
                </div>
                <div style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                  staff with 2+ devices
                </div>
              </div>

              {multiDeviceData.people?.length > 0 && (
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {multiDeviceData.people.slice(0, 15).map((person, index) => (
                    <div 
                      key={person.identifier || index}
                      style={{
                        padding: '0.6rem 0.75rem',
                        background: 'rgba(186, 104, 200, 0.05)',
                        borderRadius: '6px',
                        marginBottom: '0.4rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedPerson(expandedPerson === person.identifier ? null : person.identifier)}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 500, color: colors.textPrimary }}>
                          {person.name}
                        </span>
                        <span style={{ 
                          padding: '0.15rem 0.5rem',
                          background: 'rgba(186, 104, 200, 0.2)',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          color: '#BA68C8',
                          fontWeight: 600
                        }}>
                          {person.devices.length}
                        </span>
                      </div>
                      {expandedPerson === person.identifier && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(186, 104, 200, 0.2)' }}>
                          {person.devices.map((device, dIdx) => (
                            <div key={dIdx} style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '0.2rem' }}>
                              {device.deviceName?.match(/ESR-NNV-([A-Z0-9]+)$/i)?.[1] || device.serialNumber?.slice(0, 10) || '-'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: colors.textMuted, textAlign: 'center' }}>Unable to load</p>
          )}
        </div>
      </div>

      {/* Devices by Practice Section */}
      <div className="form-section">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.25rem'
        }}>
          <h2 className="form-section-title" style={{ margin: 0 }}>
            <FontAwesomeIcon icon={faTabletAlt} />
            Devices in Field by Practice
          </h2>
          <button 
            className="btn btn-secondary btn-small btn-icon"
            onClick={fetchPracticeData}
            disabled={practiceLoading}
          >
            <FontAwesomeIcon icon={faSync} spin={practiceLoading} />
          </button>
        </div>

        {practiceLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            Loading device data from Esper...
          </div>
        ) : !selectedPractice ? (
          // Practice Grid View
          <>
            {practiceData && (
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(230, 119, 179, 0.1)',
                borderRadius: '10px'
              }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, color: colors.accentPink }}>
                  {practiceData.totalDevices}
                </span>
                <span style={{ display: 'block', fontSize: '0.85rem', color: colors.textMuted, marginTop: '0.25rem' }}>
                  Total Devices in Esper
                </span>
              </div>
            )}

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '1rem'
            }}>
              {practiceData?.practices.map((practice) => (
                <div
                  key={practice.abbrev}
                  onClick={() => handlePracticeClick(practice)}
                  style={{
                    padding: '1.25rem 1rem',
                    background: `linear-gradient(135deg, ${getPracticeColor(practice.abbrev)}20, ${getPracticeColor(practice.abbrev)}08)`,
                    border: `1px solid ${getPracticeColor(practice.abbrev)}40`,
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${getPracticeColor(practice.abbrev)}30`;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: 700, 
                    color: getPracticeColor(practice.abbrev)
                  }}>
                    {practice.count}
                  </div>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 600, 
                    color: colors.textPrimary,
                    marginTop: '0.25rem'
                  }}>
                    {practice.abbrev}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: '0.2rem' }}>
                    {practice.name.split(' ')[0]}
                  </div>
                </div>
              ))}

              {practiceData?.unassignedCount > 0 && (
                <div
                  style={{
                    padding: '1.25rem 1rem',
                    background: 'rgba(150, 150, 150, 0.1)',
                    border: '1px solid rgba(150, 150, 150, 0.3)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    opacity: 0.7
                  }}
                >
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: colors.textMuted }}>
                    {practiceData.unassignedCount}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: colors.textMuted }}>
                    Unassigned
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Practice Detail View
          <>
            <div style={{ marginBottom: '1rem' }}>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setSelectedPractice(null)}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Back to All
              </button>
            </div>

            <div style={{
              padding: '1rem 1.25rem',
              background: `linear-gradient(135deg, ${getPracticeColor(selectedPractice.abbrev)}15, ${getPracticeColor(selectedPractice.abbrev)}05)`,
              border: `1px solid ${getPracticeColor(selectedPractice.abbrev)}30`,
              borderRadius: '10px',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.25rem', 
                  color: getPracticeColor(selectedPractice.abbrev),
                  fontWeight: 700
                }}>
                  {selectedPractice.abbrev} – {selectedPractice.name}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: colors.textMuted }}>
                  {selectedPractice.count} device{selectedPractice.count !== 1 ? 's' : ''}
                  {loadingPointCare && ' • Loading PointCare versions...'}
                </p>
              </div>
              
              <div className="search-wrapper" style={{ flex: '0 1 250px' }}>
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search staff..."
                  value={practiceSearch}
                  onChange={(e) => setPracticeSearch(e.target.value)}
                  style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {loadingPointCare && (
              <div style={{ 
                textAlign: 'center', 
                padding: '0.75rem',
                background: 'rgba(100, 181, 246, 0.1)',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: '#64B5F6'
              }}>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
                Fetching PointCare versions from Esper...
              </div>
            )}

            <div className="data-table-container" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className="data-table" style={{ minWidth: '650px' }}>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Worker ID</th>
                    <th>Device</th>
                    <th>Serial</th>
                    <th>PointCare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPracticeDevices.map((device, index) => {
                    const pcInfo = pointCareData[device.id];
                    return (
                      <tr key={device.id || index}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FontAwesomeIcon icon={faUser} style={{ color: colors.textMuted, fontSize: '0.8rem' }} />
                            <span style={{ fontWeight: 500 }}>{device.assignedTo || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td>
                          {device.workerId && (
                            <span style={{ fontSize: '0.85rem' }}>
                              <FontAwesomeIcon icon={faIdCard} style={{ marginRight: '0.3rem', color: colors.textMuted }} />
                              {device.workerId}
                            </span>
                          )}
                          {!device.workerId && '-'}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', color: colors.accentPink }}>
                            {device.deviceName?.match(/ESR-NNV-([A-Z0-9]+)$/i)?.[1] || '-'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                          {device.serialNumber?.slice(0, 12) || '-'}
                        </td>
                        <td>
                          {loadingPointCare ? (
                            <FontAwesomeIcon icon={faSpinner} spin style={{ color: colors.textMuted }} />
                          ) : pcInfo ? (
                            <span style={{ 
                              padding: '0.2rem 0.5rem',
                              background: 'rgba(76, 175, 80, 0.15)',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              color: '#81C784',
                              fontWeight: 500
                            }}>
                              v{pcInfo.version}
                            </span>
                          ) : (
                            <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>
                              {pointCareData[device.id] === null ? 'Not installed' : '-'}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`state-badge state-${device.state === 1 ? 'active' : 'inactive'}`}>
                            {formatDeviceState(device.state)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredPracticeDevices.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: colors.textMuted }}>
                No staff found matching your search.
              </div>
            )}

            <div style={{ 
              marginTop: '0.75rem', 
              fontSize: '0.8rem', 
              color: colors.textMuted, 
              textAlign: 'center' 
            }}>
              Showing {filteredPracticeDevices.length} of {selectedPractice.devices.length} {selectedPractice.abbrev}s
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CoordinatorPage;
