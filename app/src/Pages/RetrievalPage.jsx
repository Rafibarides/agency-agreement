import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPlus,
  faSpinner,
  faRefresh,
  faPhone,
  faPhoneSlash,
  faTrash,
  faStickyNote,
  faChevronRight,
  faChevronLeft,
  faCheckCircle,
  faTimesCircle,
  faGripVertical,
  faEllipsisV,
  faTabletAlt,
  faUser,
  faIdCard,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import {
  RETRIEVAL_STAGES,
  getRetrievalCases,
  updateRetrievalStage,
  updateRetrievalCallStatus,
  deleteRetrievalCase,
  addRetrievalNote,
  setScheduledDropoffDate
} from '../utils/api';
import AddRetrievalModal from '../Components/AddRetrievalModal';

const RetrievalPage = ({ onBack }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [datePickerModal, setDatePickerModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const contextMenuRef = useRef(null);

  useEffect(() => {
    fetchCases();
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRetrievalCases();
      console.log('Retrieval cases result:', JSON.stringify(result, null, 2));
      
      // Show debug info if available
      if (result.debug) {
        console.log('Debug info:', result.debug);
      }
      
      if (result.success) {
        // Normalize the data to ensure Stage is always a number
        const normalizedCases = (result.cases || []).map(c => ({
          ...c,
          Stage: parseInt(c.Stage) || 1
        }));
        console.log('Normalized cases:', normalizedCases);
        setCases(normalizedCases);
      } else {
        setError(result.error || 'Failed to fetch cases');
      }
    } catch (err) {
      console.error('Fetch cases error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    console.log('Add success callback triggered, refreshing cases...');
    setShowAddModal(false);
    // Add a small delay to ensure the sheet has been updated
    setTimeout(() => {
      fetchCases();
    }, 500);
  };

  // Get cases for a specific stage
  const getCasesForStage = (stageNum) => {
    return cases.filter(c => c.Stage === stageNum);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, caseItem) => {
    setDraggedItem(caseItem);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', caseItem.CaseID);
    // Add dragging class after a small delay to avoid flickering
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    if (!draggedItem) return;

    const currentStage = parseInt(draggedItem.Stage);
    if (currentStage === targetStage) return;

    // Optimistic update
    setCases(prev => prev.map(c => 
      c.CaseID === draggedItem.CaseID 
        ? { ...c, Stage: targetStage }
        : c
    ));

    try {
      const result = await updateRetrievalStage(draggedItem.CaseID, targetStage);
      if (!result.success) {
        // Revert on failure
        setCases(prev => prev.map(c => 
          c.CaseID === draggedItem.CaseID 
            ? { ...c, Stage: currentStage }
            : c
        ));
        alert('Failed to update stage: ' + result.error);
      }
    } catch (err) {
      // Revert on error
      setCases(prev => prev.map(c => 
        c.CaseID === draggedItem.CaseID 
          ? { ...c, Stage: currentStage }
          : c
      ));
      alert('Error updating stage: ' + err.message);
    }

    setDraggedItem(null);
  };

  // Context menu handlers
  const handleContextMenu = (e, caseItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      caseItem
    });
  };

  const handleMoveToStage = async (targetStage) => {
    if (!contextMenu?.caseItem) return;
    
    const caseItem = contextMenu.caseItem;
    const currentStage = parseInt(caseItem.Stage);
    setContextMenu(null);

    // Optimistic update
    setCases(prev => prev.map(c => 
      c.CaseID === caseItem.CaseID 
        ? { ...c, Stage: targetStage }
        : c
    ));

    try {
      const result = await updateRetrievalStage(caseItem.CaseID, targetStage);
      if (!result.success) {
        setCases(prev => prev.map(c => 
          c.CaseID === caseItem.CaseID 
            ? { ...c, Stage: currentStage }
            : c
        ));
        alert('Failed to update stage: ' + result.error);
      }
    } catch (err) {
      setCases(prev => prev.map(c => 
        c.CaseID === caseItem.CaseID 
          ? { ...c, Stage: currentStage }
          : c
      ));
    }
  };

  const handleCallStatus = async (status) => {
    if (!contextMenu?.caseItem) return;
    
    const caseItem = contextMenu.caseItem;
    setContextMenu(null);

    // Optimistic update
    setCases(prev => prev.map(c => 
      c.CaseID === caseItem.CaseID 
        ? { ...c, CallStatus: status }
        : c
    ));

    try {
      const result = await updateRetrievalCallStatus(caseItem.CaseID, status);
      if (!result.success) {
        setCases(prev => prev.map(c => 
          c.CaseID === caseItem.CaseID 
            ? { ...c, CallStatus: caseItem.CallStatus }
            : c
        ));
        alert('Failed to update call status: ' + result.error);
      }
    } catch (err) {
      setCases(prev => prev.map(c => 
        c.CaseID === caseItem.CaseID 
          ? { ...c, CallStatus: caseItem.CallStatus }
          : c
      ));
    }
  };

  const handleDelete = async () => {
    if (!contextMenu?.caseItem) return;
    
    const caseItem = contextMenu.caseItem;
    setContextMenu(null);

    if (!confirm(`Remove "${caseItem.StaffName}" from the retrieval program?`)) {
      return;
    }

    // Optimistic update
    setCases(prev => prev.filter(c => c.CaseID !== caseItem.CaseID));

    try {
      const result = await deleteRetrievalCase(caseItem.CaseID);
      if (!result.success) {
        fetchCases(); // Reload on failure
        alert('Failed to delete case: ' + result.error);
      }
    } catch (err) {
      fetchCases();
    }
  };

  const handleAddNote = () => {
    if (!contextMenu?.caseItem) return;
    setNoteModal(contextMenu.caseItem);
    setNoteText('');
    setContextMenu(null);
  };

  const submitNote = async () => {
    if (!noteModal || !noteText.trim()) return;

    try {
      const result = await addRetrievalNote(noteModal.CaseID, noteText.trim());
      if (result.success) {
        // Update local state with new notes
        setCases(prev => prev.map(c => 
          c.CaseID === noteModal.CaseID 
            ? { ...c, Notes: result.notes }
            : c
        ));
      } else {
        alert('Failed to add note: ' + result.error);
      }
    } catch (err) {
      alert('Error adding note: ' + err.message);
    }

    setNoteModal(null);
    setNoteText('');
  };

  // Open date picker for scheduled dropoff (Stage 5)
  const handleSetDropoffDate = () => {
    if (!contextMenu?.caseItem) return;
    setDatePickerModal(contextMenu.caseItem);
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
    setContextMenu(null);
  };

  // Submit the scheduled dropoff date
  const submitDropoffDate = async () => {
    if (!datePickerModal || !selectedDate) return;

    try {
      const result = await setScheduledDropoffDate(datePickerModal.CaseID, selectedDate);
      if (result.success) {
        // Update local state with the new date
        setCases(prev => prev.map(c =>
          c.CaseID === datePickerModal.CaseID
            ? { ...c, ScheduledDropoffDate: result.scheduledDropoffDate }
            : c
        ));
      } else {
        alert('Failed to set dropoff date: ' + result.error);
      }
    } catch (err) {
      alert('Error setting dropoff date: ' + err.message);
    }

    setDatePickerModal(null);
    setSelectedDate('');
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format scheduled dropoff date for display
  const formatDropoffDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

// Render a case card
  const renderCaseCard = (caseItem) => {
    const isStage3 = parseInt(caseItem.Stage) === 3;
    const isStage5 = parseInt(caseItem.Stage) === 5;
    const callStatus = caseItem.CallStatus;
    const phones = caseItem.phones || [];
    const hasPhones = phones.length > 0;
    const scheduledDate = formatDropoffDate(caseItem.ScheduledDropoffDate);

    return (
      <div
        key={caseItem.CaseID}
        className="kanban-card"
        draggable
        onDragStart={(e) => handleDragStart(e, caseItem)}
        onDragEnd={handleDragEnd}
        onContextMenu={(e) => handleContextMenu(e, caseItem)}
      >
        <div className="kanban-card-header">
          <FontAwesomeIcon icon={faGripVertical} className="drag-handle" />
          <span className="card-name">{caseItem.StaffName || 'Unknown'}</span>
        </div>

        <div className="kanban-card-body">
          <div className="card-detail">
            <FontAwesomeIcon icon={faTabletAlt} />
            <span>{caseItem.DeviceType || 'Device'}</span>
          </div>
          <div className="card-detail">
            <FontAwesomeIcon icon={faIdCard} />
            <span className="serial">{caseItem.SerialNumber || 'N/A'}</span>
          </div>
          {caseItem.Title && (
            <div className="card-detail">
              <FontAwesomeIcon icon={faUser} />
              <span>{caseItem.Title}</span>
            </div>
          )}
        </div>

        {/* Phone Numbers */}
        {hasPhones && (
          <div className="card-phones">
            {phones.map((phone, idx) => (
              <a
                key={idx}
                href={`tel:${phone.number.replace(/\D/g, '')}`}
                className="phone-link"
                onClick={(e) => e.stopPropagation()}
                title={`${phone.type}: ${phone.number}`}
              >
                <FontAwesomeIcon icon={faPhone} />
                <span>{phone.number}</span>
                {phones.length > 1 && <span className="phone-type">{phone.type}</span>}
              </a>
            ))}
          </div>
        )}

        {isStage3 && (
          <div className={`call-status-badge ${callStatus === 'did_not_answer' ? 'dna' : 'success'}`}>
            <FontAwesomeIcon icon={callStatus === 'did_not_answer' ? faPhoneSlash : faPhone} />
            {callStatus === 'did_not_answer' ? 'No Answer' : 'Called'}
          </div>
        )}

        {/* Scheduled Dropoff Date for Stage 5 */}
        {isStage5 && scheduledDate && (
          <div className="scheduled-dropoff-badge">
            <FontAwesomeIcon icon={faCalendarAlt} />
            {scheduledDate}
          </div>
        )}

        <div className="kanban-card-footer">
          <span className="card-date">{formatDate(caseItem.LastUpdated || caseItem.Created)}</span>
          {caseItem.Notes && caseItem.Notes.length > 0 && (
            <span className="notes-indicator" title={`${caseItem.Notes.length} note(s)`}>
              <FontAwesomeIcon icon={faStickyNote} />
              {caseItem.Notes.length}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render a stage column
  const renderStageColumn = (stageNum, stageInfo) => {
    const stageCases = getCasesForStage(stageNum);
    const isFirstStage = stageNum === 1;
    const isSuccessStage = stageNum === 7;
    const isClosedStage = stageNum === 8;

    return (
      <div 
        key={stageNum}
        className={`kanban-column ${isSuccessStage ? 'success' : ''} ${isClosedStage ? 'closed' : ''}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, stageNum)}
      >
        <div className="kanban-column-header" style={{ borderColor: stageInfo.color }}>
          <div className="column-title">
            <span className="stage-number" style={{ background: stageInfo.color }}>
              {stageNum}
            </span>
            <span className="stage-name">{stageInfo.name}</span>
          </div>
          <span className="case-count">{stageCases.length}</span>
          {isFirstStage && (
            <button 
              className="add-case-btn"
              onClick={() => setShowAddModal(true)}
              title="Add new case"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          )}
        </div>
        
        <div className="kanban-column-body">
          {stageCases.map(caseItem => renderCaseCard(caseItem))}
          
          {stageCases.length === 0 && (
            <div className="empty-column">
              {isFirstStage ? 'Click + to add a case' : 'Drag items here'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="retrieval-page">
      {/* Header */}
      <div className="retrieval-header">
        <div className="header-left">
          <button className="btn btn-secondary" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Back
          </button>
          <h1>Device Retrieval Program</h1>
        </div>
        <div className="header-right">
          <button 
            className="btn btn-secondary" 
            onClick={fetchCases}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faRefresh} spin={loading} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="message message-error" style={{ margin: '1rem' }}>
          {error}
        </div>
      )}

      {/* Kanban Board */}
      <div className="kanban-board">
        {loading && cases.length === 0 ? (
          <div className="kanban-loading">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            <p>Loading retrieval cases...</p>
          </div>
        ) : (
          Object.entries(RETRIEVAL_STAGES).map(([stageNum, stageInfo]) => 
            renderStageColumn(parseInt(stageNum), stageInfo)
          )
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          ref={contextMenuRef}
          className="kanban-context-menu"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y 
          }}
        >
          <div className="context-menu-header">
            {contextMenu.caseItem.StaffName}
          </div>
          
          {/* Stage 3 specific options */}
          {parseInt(contextMenu.caseItem.Stage) === 3 && (
            <>
              <button onClick={() => handleCallStatus('successful')}>
                <FontAwesomeIcon icon={faPhone} />
                Call Successful
              </button>
              <button onClick={() => handleCallStatus('did_not_answer')}>
                <FontAwesomeIcon icon={faPhoneSlash} />
                Did Not Answer
              </button>
              <div className="context-menu-divider" />
            </>
          )}

          {/* Stage 5 specific options */}
          {parseInt(contextMenu.caseItem.Stage) === 5 && (
            <>
              <button onClick={handleSetDropoffDate}>
                <FontAwesomeIcon icon={faCalendarAlt} />
                Set Dropoff Date
              </button>
              <div className="context-menu-divider" />
            </>
          )}

          {/* Move to stage options */}
          <div className="context-submenu">
            <span className="submenu-label">Move to Stage:</span>
            <div className="stage-buttons">
              {Object.entries(RETRIEVAL_STAGES).map(([num, info]) => {
                const stageNum = parseInt(num);
                const currentStage = parseInt(contextMenu.caseItem.Stage);
                if (stageNum === currentStage) return null;
                
                return (
                  <button 
                    key={num}
                    className="stage-btn"
                    style={{ borderColor: info.color }}
                    onClick={() => handleMoveToStage(stageNum)}
                    title={info.name}
                  >
                    {stageNum}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="context-menu-divider" />
          
          <button onClick={handleAddNote}>
            <FontAwesomeIcon icon={faStickyNote} />
            Add Note
          </button>
          
          <button className="danger" onClick={handleDelete}>
            <FontAwesomeIcon icon={faTrash} />
            Remove from Program
          </button>
        </div>
      )}

      {/* Add Case Modal */}
      <AddRetrievalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

{/* Add Note Modal */}
      {noteModal && (
        <div className="modal-overlay" onClick={() => setNoteModal(null)}>
          <div className="note-modal" onClick={e => e.stopPropagation()}>
            <h3>Add Note for {noteModal.StaffName}</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note..."
              autoFocus
            />
            <div className="note-modal-actions">
              <button className="btn btn-secondary" onClick={() => setNoteModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submitNote}
                disabled={!noteText.trim()}
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal for Scheduled Dropoff */}
      {datePickerModal && (
        <div className="modal-overlay" onClick={() => setDatePickerModal(null)}>
          <div className="date-picker-modal" onClick={e => e.stopPropagation()}>
            <h3>
              <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '0.5rem', color: '#2196F3' }} />
              Schedule Dropoff
            </h3>
            <p className="modal-subtitle">Set the dropoff date for {datePickerModal.StaffName}</p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
              min={new Date().toISOString().split('T')[0]}
              autoFocus
            />
            <div className="note-modal-actions">
              <button className="btn btn-secondary" onClick={() => setDatePickerModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submitDropoffDate}
                disabled={!selectedDate}
              >
                <FontAwesomeIcon icon={faCalendarAlt} />
                Set Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetrievalPage;
