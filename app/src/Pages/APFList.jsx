import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClipboardList, 
  faSpinner, 
  faUser,
  faIdCard,
  faArrowRight,
  faSearch,
  faExclamationTriangle,
  faMagic
} from '@fortawesome/free-solid-svg-icons';
import { getUnsignedAgreements } from '../utils/api';
import { enhanceFormWithEsperData } from '../utils/esperHelpers';
import colors from '../utils/colors';

const APFList = ({ onSelectAgreement }) => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectingRow, setSelectingRow] = useState(null); // Track which row is being processed

  useEffect(() => {
    fetchUnsignedAgreements();
  }, []);

  const fetchUnsignedAgreements = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await getUnsignedAgreements();
      if (result.success) {
        setAgreements(result.agreements || []);
      } else {
        setError(result.error || 'Failed to fetch agreements');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgreements = agreements.filter(agreement => {
    const search = searchQuery.toLowerCase();
    return (
      (agreement.Name && agreement.Name.toString().toLowerCase().includes(search)) ||
      (agreement['Worker ID'] && agreement['Worker ID'].toString().toLowerCase().includes(search)) ||
      (agreement.Title && agreement.Title.toString().toLowerCase().includes(search))
    );
  });

  const handleSelect = async (agreement) => {
    setSelectingRow(agreement.rowNumber);
    
    // Convert spreadsheet data to form data format
    let formData = {
      name: agreement.Name || '',
      title: agreement.Title || '',
      workerId: agreement['Worker ID']?.toString() || '',
      hasDifferentTrainingId: agreement['Has Different Training ID'] || false,
      trainingWorkerId: agreement['Training Worker ID']?.toString() || '',
      device: agreement.Device || false,
      deviceName: agreement['Device Name'] || '',
      portableCharger: agreement['Portable Charger'] || false,
      protectiveCover: agreement['Protective Cover'] || false,
      keyboard: agreement['Keyboard/Accessory'] || false,
      serialNumber: agreement['Serial Number'] || '',
      esperIdentifier: agreement['Esper Identifier Code'] || '',
      exchangeDevice: agreement['Exchange Device'] || false,
      returningDeviceName: agreement['Returning Device Name'] || '',
      returningSerial: agreement['Returning Serial Number'] || '',
      agreement1: agreement['Agreement 1'] || false,
      agreement2: agreement['Agreement 2'] || false,
      agreement3: agreement['Agreement 3'] || false,
      rowNumber: agreement.rowNumber
    };
    
    // Try to enhance form with Esper data (non-blocking)
    try {
      const enhanceResult = await enhanceFormWithEsperData(formData);
      if (enhanceResult.enhanced) {
        formData = enhanceResult.data;
        console.log('APF form enhanced with Esper data:', enhanceResult.fieldsEnhanced);
      }
    } catch (esperError) {
      // Esper enhancement failed - continue with original data
      console.warn('Esper enhancement skipped:', esperError.message);
    }
    
    setSelectingRow(null);
    onSelectAgreement(formData);
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

  return (
    <div className="page-container">
      <div className="form-section glass" style={{ marginTop: '1.5rem' }}>
        <h2 className="form-section-title">
          <FontAwesomeIcon icon={faClipboardList} />
          Access Prefilled Forms (APF)
        </h2>
        
        <p style={{ color: colors.textSecondary, marginBottom: '1.5rem' }}>
          Select a form to complete with signatures. These forms were held for signature and are awaiting completion.
        </p>

        {/* Search */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <FontAwesomeIcon 
              icon={faSearch} 
              style={{ 
                position: 'absolute', 
                left: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: colors.textMuted
              }} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              placeholder="Search by name, Worker ID, or title..."
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <FontAwesomeIcon 
              icon={faSpinner} 
              spin 
              style={{ fontSize: '2rem', color: colors.accentPink }} 
            />
            <p style={{ color: colors.textSecondary, marginTop: '1rem' }}>
              Loading prefilled forms...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: 'rgba(229, 115, 115, 0.1)',
            borderRadius: '8px',
            border: `1px solid ${colors.errorRed}`
          }}>
            <FontAwesomeIcon 
              icon={faExclamationTriangle} 
              style={{ fontSize: '2rem', color: colors.errorRed }} 
            />
            <p style={{ color: colors.errorRed, marginTop: '1rem' }}>{error}</p>
            <button 
              className="btn btn-secondary" 
              onClick={fetchUnsignedAgreements}
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredAgreements.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <FontAwesomeIcon 
              icon={faClipboardList} 
              style={{ fontSize: '3rem', color: colors.textMuted, marginBottom: '1rem' }} 
            />
            <p style={{ color: colors.textSecondary }}>
              {searchQuery 
                ? 'No forms match your search.' 
                : 'No forms awaiting signatures.'}
            </p>
          </div>
        )}

        {/* Agreements List */}
        {!loading && !error && filteredAgreements.length > 0 && (
          <div className="apf-list">
            {filteredAgreements.map((agreement, index) => {
              const isSelecting = selectingRow === agreement.rowNumber;
              return (
                <div 
                  key={agreement.rowNumber || index}
                  className="apf-item glass-subtle"
                  onClick={() => !isSelecting && handleSelect(agreement)}
                  style={{
                    padding: '1rem 1.25rem',
                    marginBottom: '0.75rem',
                    borderRadius: '8px',
                    cursor: isSelecting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    border: `1px solid ${colors.glassBorder}`,
                    opacity: isSelecting ? 0.7 : 1
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      marginBottom: '0.5rem'
                    }}>
                      <FontAwesomeIcon 
                        icon={faUser} 
                        style={{ color: colors.accentPink }} 
                      />
                      <span style={{ 
                        fontWeight: '600', 
                        color: colors.textPrimary,
                        fontSize: '1.05rem'
                      }}>
                        {agreement.Name || 'Unknown'}
                      </span>
                      {isSelecting && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: colors.accentPink,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <FontAwesomeIcon icon={faMagic} />
                          Enhancing...
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1.5rem',
                      fontSize: '0.9rem',
                      color: colors.textSecondary
                    }}>
                      <span>
                        <FontAwesomeIcon 
                          icon={faIdCard} 
                          style={{ marginRight: '0.5rem' }} 
                        />
                        ID: {agreement['Worker ID'] || 'N/A'}
                      </span>
                      <span>{agreement.Title || 'N/A'}</span>
                      <span style={{ color: colors.textMuted }}>
                        {formatDate(agreement.Timestamp)}
                      </span>
                    </div>
                  </div>
                  <FontAwesomeIcon 
                    icon={isSelecting ? faSpinner : faArrowRight} 
                    spin={isSelecting}
                    style={{ 
                      color: colors.accentPink,
                      fontSize: '1.25rem'
                    }} 
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Count */}
        {!loading && !error && agreements.length > 0 && (
          <p style={{ 
            textAlign: 'center', 
            color: colors.textMuted, 
            marginTop: '1.5rem',
            fontSize: '0.9rem'
          }}>
            {filteredAgreements.length} of {agreements.length} form{agreements.length !== 1 ? 's' : ''} awaiting signatures
          </p>
        )}
      </div>
    </div>
  );
};

export default APFList;

