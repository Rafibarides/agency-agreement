import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faSearch,
  faTabletAlt,
  faUser,
  faIdCard,
  faCheck,
  faPlus,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { getAllDevices, isEsperConfigured } from '../utils/esperApi';
import { createRetrievalCase } from '../utils/api';

const AddRetrievalModal = ({ isOpen, onClose, onSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    } else {
      // Reset state when modal closes
      setSearchTerm('');
      setSelectedDevice(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDevices(devices);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = devices.filter(device => {
      const name = (device.assignedTo || '').toLowerCase();
      const deviceName = (device.deviceName || '').toLowerCase();
      const serial = (device.serialNumber || '').toLowerCase();
      const workerId = (device.workerId || '').toLowerCase();
      const title = (device.title || '').toLowerCase();
      
      return name.includes(term) || 
             deviceName.includes(term) || 
             serial.includes(term) ||
             workerId.includes(term) ||
             title.includes(term);
    });
    
    setFilteredDevices(filtered);
  }, [searchTerm, devices]);

  const fetchDevices = async () => {
    if (!isEsperConfigured()) {
      setError('Esper API is not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allDevices = await getAllDevices();
      
      // Transform devices into a usable format with extracted person info
      const transformed = allDevices.map(device => {
        // Extract person info from tags
        const tags = device.tags || [];
        let assignedTo = null;
        let workerId = null;
        let title = null;

        const TITLE_ABBREVS = ['RN', 'LPN', 'PT', 'PTA', 'OT', 'COTA', 'ST', 'SLP'];

        for (const tag of tags) {
          const trimmed = String(tag).trim();
          
          // Check if it's a worker ID (numeric)
          if (/^\d+$/.test(trimmed)) {
            workerId = trimmed;
          }
          // Check if it's a title
          else if (TITLE_ABBREVS.includes(trimmed.toUpperCase())) {
            title = trimmed.toUpperCase();
          }
          // Otherwise it might be a name
          else if (trimmed.length > 2 && !assignedTo) {
            assignedTo = trimmed;
          }
        }

        return {
          id: device.id,
          deviceName: device.device_name,
          aliasName: device.alias_name,
          serialNumber: device.hardwareInfo?.serialNumber || device.suid || '',
          model: device.hardwareInfo?.model || '',
          brand: device.hardwareInfo?.brand || '',
          state: device.state,
          assignedTo,
          workerId,
          title,
          // Build device type string
          deviceType: [device.hardwareInfo?.brand, device.hardwareInfo?.model]
            .filter(Boolean)
            .join(' ') || 'Unknown Device'
        };
      });

      // Sort by assigned name
      transformed.sort((a, b) => {
        const nameA = (a.assignedTo || 'ZZZ').toLowerCase();
        const nameB = (b.assignedTo || 'ZZZ').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setDevices(transformed);
      setFilteredDevices(transformed);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      setError(err.message || 'Failed to fetch devices from Esper');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
  };

  const handleSubmit = async () => {
    if (!selectedDevice) return;

    setSubmitting(true);
    setError(null);

    try {
      const caseData = {
        staffName: selectedDevice.assignedTo || 'Unknown',
        workerId: selectedDevice.workerId || '',
        title: selectedDevice.title || '',
        deviceType: selectedDevice.deviceType,
        deviceName: selectedDevice.deviceName || selectedDevice.aliasName || '',
        serialNumber: selectedDevice.serialNumber,
        esperID: selectedDevice.id
      };
      console.log('Creating retrieval case with data:', caseData);
      
      const result = await createRetrievalCase(caseData);
      console.log('Create retrieval case result:', result);

      if (result.success) {
        console.log('Success! Calling onSuccess callback');
        onSuccess();
      } else {
        setError(result.error || 'Failed to create retrieval case');
      }
    } catch (err) {
      console.error('Create retrieval case error:', err);
      setError(err.message || 'Error creating retrieval case');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="add-retrieval-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="add-retrieval-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FontAwesomeIcon icon={faPlus} style={{ color: '#EF5350' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              Add to Retrieval Program
            </h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Search */}
        <div className="add-retrieval-search">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, worker ID, serial, or device..."
            className="search-input"
            autoFocus
          />
        </div>

        {/* Error */}
        {error && (
          <div className="message message-error" style={{ margin: '0 1rem' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} />
            {error}
          </div>
        )}

        {/* Device List */}
        <div className="add-retrieval-body">
          {loading ? (
            <div className="loading-state">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" />
              <p>Loading devices from Esper...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? 'No devices match your search' : 'No devices found'}
            </div>
          ) : (
            <div className="device-list">
              {filteredDevices.map(device => (
                <div
                  key={device.id}
                  className={`device-item ${selectedDevice?.id === device.id ? 'selected' : ''}`}
                  onClick={() => handleSelectDevice(device)}
                >
                  <div className="device-item-main">
                    <div className="device-icon">
                      <FontAwesomeIcon icon={faTabletAlt} />
                    </div>
                    <div className="device-info">
                      <div className="device-name">
                        {device.assignedTo || 'Unassigned'}
                        {device.title && (
                          <span className="title-badge">{device.title}</span>
                        )}
                      </div>
                      <div className="device-details">
                        <span>
                          <FontAwesomeIcon icon={faIdCard} />
                          {device.serialNumber || 'No Serial'}
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faTabletAlt} />
                          {device.deviceType}
                        </span>
                        {device.workerId && (
                          <span>
                            <FontAwesomeIcon icon={faUser} />
                            ID: {device.workerId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedDevice?.id === device.id && (
                    <div className="selected-indicator">
                      <FontAwesomeIcon icon={faCheck} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="add-retrieval-footer">
          <div className="footer-info">
            {selectedDevice && (
              <span>
                Selected: <strong>{selectedDevice.assignedTo || 'Unknown'}</strong> - {selectedDevice.serialNumber}
              </span>
            )}
          </div>
          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!selectedDevice || submitting}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Adding...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPlus} />
                  Add to Retrieval
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRetrievalModal;
