import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEye, 
  faSearch,
  faChevronLeft,
  faChevronRight,
  faCopy,
  faCheck,
  faUndo,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import Preview from './Preview';

const List = ({ agreements, loading, searchQuery, onSearchChange }) => {
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedField, setCopiedField] = useState(null);
  const [returnedDevices, setReturnedDevices] = useState({});
  const [returnModal, setReturnModal] = useState(null);
  const itemsPerPage = 10;

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const copyToClipboard = async (text, fieldId) => {
    if (!text || text === '-') return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRowDoubleClick = (agreement) => {
    setReturnModal(agreement);
  };

  const markAsReturned = (rowNumber) => {
    setReturnedDevices(prev => ({
      ...prev,
      [rowNumber]: true
    }));
    setReturnModal(null);
  };

  const unmarkAsReturned = (rowNumber) => {
    setReturnedDevices(prev => {
      const updated = { ...prev };
      delete updated[rowNumber];
      return updated;
    });
    setReturnModal(null);
  };

  // Pagination logic
  const totalPages = Math.ceil(agreements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAgreements = agreements.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const CopyableCell = ({ value, fieldId }) => {
    const displayValue = value || '-';
    const canCopy = value && value !== '-';
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>{displayValue}</span>
        {canCopy && (
          <button
            className="copy-btn"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(value, fieldId);
            }}
            title="Copy to clipboard"
          >
            <FontAwesomeIcon 
              icon={copiedField === fieldId ? faCheck : faCopy} 
              size="xs"
            />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Search */}
      <div className="search-container">
        <div className="search-wrapper">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, Worker ID, serial, or Esper ID..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          Loading agreements...
        </div>
      ) : agreements.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {searchQuery ? 'No agreements found matching your search.' : 'No agreements have been submitted yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Worker ID</th>
                  <th>Serial #</th>
                  <th>Esper ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAgreements.map((agreement, index) => {
                  const rowId = agreement.rowNumber || index;
                  const isReturned = returnedDevices[rowId];
                  
                  return (
                    <tr 
                      key={rowId}
                      onDoubleClick={() => handleRowDoubleClick(agreement)}
                      className={isReturned ? 'row-returned' : ''}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      <td>{formatDate(agreement.Timestamp)}</td>
                      <td>
                        <CopyableCell 
                          value={agreement.Name} 
                          fieldId={`name-${rowId}`}
                        />
                        {isReturned && (
                          <span className="returned-badge">Returned</span>
                        )}
                      </td>
                      <td>{agreement.Title ? agreement.Title.split('–')[0].trim() : '-'}</td>
                      <td>{agreement['Worker ID'] || '-'}</td>
                      <td>
                        <CopyableCell 
                          value={agreement['Serial Number']} 
                          fieldId={`serial-${rowId}`}
                        />
                      </td>
                      <td>
                        <CopyableCell 
                          value={agreement['Esper Identifier Code']} 
                          fieldId={`esper-${rowId}`}
                        />
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-small btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAgreement(agreement);
                          }}
                          title="View Document"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '1rem',
              marginTop: '1.5rem'
            }}>
              <button 
                className="btn btn-secondary btn-small btn-icon"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <span style={{ color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="btn btn-secondary btn-small btn-icon"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          )}

          <div style={{ 
            textAlign: 'center', 
            marginTop: '1rem', 
            color: 'var(--text-muted)',
            fontSize: '0.875rem'
          }}>
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, agreements.length)} of {agreements.length} agreements
          </div>
        </>
      )}

      {/* Preview Modal */}
      {selectedAgreement && (
        <Preview 
          agreement={selectedAgreement} 
          onClose={() => setSelectedAgreement(null)} 
        />
      )}

      {/* Return Device Modal */}
      {returnModal && (
        <div className="modal-overlay" onClick={() => setReturnModal(null)}>
          <div 
            className="return-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="return-modal-header">
              <h4>Device Return Status</h4>
              <button 
                className="modal-close"
                onClick={() => setReturnModal(null)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="return-modal-body">
              <p><strong>{returnModal.Name}</strong></p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {returnModal['Serial Number'] || 'No serial number'}
              </p>
            </div>
            <div className="return-modal-actions">
              {returnedDevices[returnModal.rowNumber] ? (
                <button 
                  className="btn btn-secondary"
                  onClick={() => unmarkAsReturned(returnModal.rowNumber)}
                >
                  <FontAwesomeIcon icon={faUndo} />
                  Unmark as Returned
                </button>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={() => markAsReturned(returnModal.rowNumber)}
                >
                  <FontAwesomeIcon icon={faCheck} />
                  Mark as Returned
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default List;
