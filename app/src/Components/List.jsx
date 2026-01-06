import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEye, 
  faSearch,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import Preview from './Preview';

const List = ({ agreements, loading, searchQuery, onSearchChange }) => {
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Pagination logic
  const totalPages = Math.ceil(agreements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAgreements = agreements.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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
                {paginatedAgreements.map((agreement, index) => (
                  <tr key={agreement.rowNumber || index}>
                    <td>{formatDate(agreement.Timestamp)}</td>
                    <td>{agreement.Name || '-'}</td>
                    <td>{agreement.Title ? agreement.Title.split('–')[0].trim() : '-'}</td>
                    <td>{agreement['Worker ID'] || '-'}</td>
                    <td>{agreement['Serial Number'] || '-'}</td>
                    <td>{agreement['Esper Identifier Code'] || '-'}</td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-small btn-icon"
                        onClick={() => setSelectedAgreement(agreement)}
                        title="View Document"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </td>
                  </tr>
                ))}
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
    </>
  );
};

export default List;

