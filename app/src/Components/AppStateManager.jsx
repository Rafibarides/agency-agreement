import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
  faSpinner,
  faTimes,
  faExclamationTriangle,
  faCheckCircle,
  faSearch,
  faTabletAlt,
  faPaperPlane,
  faCheck,
  faTimesCircle,
  faSync,
  faSquare,
  faChevronDown,
  faChevronRight,
  faList,
  faLayerGroup,
  faBan,
  faFilter,
  faDownload,
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import {
  getAllDevices,
  setAppState,
  batchGetAppStates,
  isEsperConfigured,
} from '../utils/esperApi';

const PACKAGE_NAME = 'com.android.chrome';
const BATCH_SIZE = 100;

const DISCIPLINE_MAP = {
  'RN': 'RN – Registered Nurse',
  'LPN': 'LPN – Licensed Practical Nurse',
  'PT': 'PT – Physical Therapist',
  'PTA': 'PTA – Physical Therapist Assistant',
  'OT': 'OT – Occupational Therapist',
  'COTA': 'COTA – Certified OT Assistant',
  'ST': 'ST – Speech Therapist',
  'SLP': 'ST – Speech Therapist',
};
const DISCIPLINE_ORDER = ['RN', 'LPN', 'PT', 'PTA', 'OT', 'COTA', 'ST'];

const APP_STATES = [
  { value: 'SHOW', label: 'Show', icon: faEye, desc: 'App visible on device', color: '#81C784' },
  { value: 'HIDE', label: 'Hide', icon: faEyeSlash, desc: 'App hidden from launcher', color: '#FFB74D' },
  { value: 'DISABLE', label: 'Disable', icon: faBan, desc: 'App fully disabled', color: '#E57373' },
];

function extractNameFromTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  const TITLE_ABBREVS = ['RN', 'LPN', 'PT', 'PTA', 'OT', 'COTA', 'ST', 'SLP'];
  for (const tag of tags) {
    const trimmed = String(tag).trim();
    if (!/^\d+$/.test(trimmed) && !TITLE_ABBREVS.includes(trimmed.toUpperCase()) && trimmed.length > 2) {
      return trimmed;
    }
  }
  return null;
}

function extractDisciplineFromTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  for (const tag of tags) {
    const upper = String(tag).trim().toUpperCase();
    if (upper === 'SLP') return 'ST';
    if (DISCIPLINE_MAP[upper]) return upper;
  }
  return null;
}

const APP_STATE_BADGE = {
  SHOW: { label: 'Show', color: '#81C784', bg: 'rgba(129, 199, 132, 0.2)' },
  HIDE: { label: 'Hide', color: '#FFB74D', bg: 'rgba(255, 183, 77, 0.2)' },
  DISABLE: { label: 'Disabled', color: '#E57373', bg: 'rgba(229, 115, 115, 0.2)' },
};

const DeviceRow = ({ device, isSelected, onToggle, showDiscipline, chromeState }) => (
  <label className={`device-checklist-item ${isSelected ? 'selected' : ''}`}>
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => onToggle(device.id)}
    />
    <span className="device-check-icon">
      <FontAwesomeIcon icon={isSelected ? faCheck : faSquare} />
    </span>
    <div className="device-checklist-info">
      <span className="device-checklist-name">
        {device.assignedTo || device.alias || device.name}
        {showDiscipline && device.discipline && (
          <span className="device-discipline-tag">{device.discipline}</span>
        )}
        {chromeState && APP_STATE_BADGE[chromeState] && (
          <span
            className="device-app-state-badge"
            style={{ background: APP_STATE_BADGE[chromeState].bg, color: APP_STATE_BADGE[chromeState].color }}
          >
            {APP_STATE_BADGE[chromeState].label}
          </span>
        )}
      </span>
      <span className="device-checklist-detail">
        {device.name}
        {device.model && ` · ${device.model}`}
        {device.state === 1 && <span className="state-dot active" />}
        {device.state !== 1 && <span className="state-dot inactive" />}
      </span>
    </div>
  </label>
);

const AppStateManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [selectedState, setSelectedState] = useState('SHOW');
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('state'); // 'state' | 'devices' | 'results'
  const [viewMode, setViewMode] = useState('discipline');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [chromeStates, setChromeStates] = useState({}); // deviceId -> { state: 'SHOW'|'HIDE'|'DISABLE'|... }
  const [loadingStates, setLoadingStates] = useState(false);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const [statesProgress, setStatesProgress] = useState({ done: 0, total: 0 });
  const [stateFilter, setStateFilter] = useState('ALL'); // 'ALL' | 'SHOW' | 'HIDE' | 'DISABLE' | 'UNKNOWN'

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    setError('');
    try {
      const allDevices = await getAllDevices();
      const sorted = allDevices
        .map(d => ({
          id: d.id,
          name: d.device_name,
          alias: d.alias_name,
          state: d.state,
          assignedTo: extractNameFromTags(d.tags),
          discipline: extractDisciplineFromTags(d.tags),
          tags: d.tags || [],
          model: d.hardwareInfo?.model,
        }))
        .sort((a, b) => {
          const nameA = (a.assignedTo || a.name || 'ZZZ').toLowerCase();
          const nameB = (b.assignedTo || b.name || 'ZZZ').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      setDevices(sorted);
    } catch (err) {
      setError('Failed to load devices: ' + err.message);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && devices.length === 0 && !loadingDevices) {
      loadDevices();
    }
  }, [isOpen, devices.length, loadingDevices, loadDevices]);

  const handleOpen = () => {
    if (!isEsperConfigured()) {
      alert('Esper API is not configured. Check your environment variables.');
      return;
    }
    setIsOpen(true);
    setStep('state');
    setPushResults(null);
    setShowConfirm(false);
  };

  const handleClose = () => {
    if (pushing) return;
    setIsOpen(false);
    setSearchQuery('');
    setShowConfirm(false);
  };

  const handleLoadChromeStates = useCallback(async () => {
    if (devices.length === 0) return;
    setLoadingStates(true);
    setStatesProgress({ done: 0, total: devices.length });
    try {
      const results = await batchGetAppStates(devices, PACKAGE_NAME, (done, total) => {
        setStatesProgress({ done, total });
      });
      setChromeStates(results);
      setStatesLoaded(true);
    } catch (err) {
      console.error('Failed to load app states:', err);
    } finally {
      setLoadingStates(false);
    }
  }, [devices]);

  const getChromeStateForDevice = (deviceId) => {
    const info = chromeStates[deviceId];
    if (!info) return null;
    const s = String(info.state || '').toUpperCase();
    if (s === 'SHOW') return 'SHOW';
    if (s === 'HIDE') return 'HIDE';
    if (s === 'DISABLE' || s === 'DISABLED') return 'DISABLE';
    return s || null;
  };

  const filteredDevices = devices.filter(d => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.alias && d.alias.toLowerCase().includes(q)) ||
      (d.assignedTo && d.assignedTo.toLowerCase().includes(q)) ||
      (d.tags && d.tags.some(t => String(t).toLowerCase().includes(q)))
    );
    if (!matchesSearch) return false;

    if (stateFilter === 'ALL') return true;
    const deviceChromeState = getChromeStateForDevice(d.id);
    if (stateFilter === 'UNKNOWN') return !deviceChromeState;
    return deviceChromeState === stateFilter;
  });

  const groupedDevices = (() => {
    const groups = {};
    for (const d of filteredDevices) {
      const key = d.discipline || '_unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    const ordered = [];
    for (const disc of DISCIPLINE_ORDER) {
      if (groups[disc]) ordered.push({ key: disc, label: DISCIPLINE_MAP[disc], devices: groups[disc] });
    }
    if (groups._unassigned) {
      ordered.push({ key: '_unassigned', label: 'No Discipline Tag', devices: groups._unassigned });
    }
    return ordered;
  })();

  const handleSelectAll = () => {
    const next = new Set(selectedDeviceIds);
    filteredDevices.forEach(d => next.add(d.id));
    setSelectedDeviceIds(next);
  };
  const handleDeselectAll = () => {
    const next = new Set(selectedDeviceIds);
    filteredDevices.forEach(d => next.delete(d.id));
    setSelectedDeviceIds(next);
  };
  const handleToggleDevice = (deviceId) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      next.has(deviceId) ? next.delete(deviceId) : next.add(deviceId);
      return next;
    });
  };
  const handleToggleGroup = (groupKey) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  };
  const handleSelectGroup = (groupDevices) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      groupDevices.forEach(d => next.add(d.id));
      return next;
    });
  };
  const handleDeselectGroup = (groupDevices) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      groupDevices.forEach(d => next.delete(d.id));
      return next;
    });
  };
  const isGroupFullySelected = (gd) => gd.length > 0 && gd.every(d => selectedDeviceIds.has(d.id));
  const groupSelectedCount = (gd) => gd.filter(d => selectedDeviceIds.has(d.id)).length;

  const handleConfirmPush = async () => {
    setShowConfirm(false);
    setPushing(true);
    setPushResults(null);
    setStep('results');

    const deviceIdArray = Array.from(selectedDeviceIds);
    const results = [];

    try {
      for (let i = 0; i < deviceIdArray.length; i += BATCH_SIZE) {
        const batch = deviceIdArray.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(deviceIdArray.length / BATCH_SIZE);
        try {
          const response = await setAppState(batch, PACKAGE_NAME, selectedState);
          results.push({ batchNum, totalBatches, deviceCount: batch.length, success: true, requestId: response.id, status: response.status });
        } catch (err) {
          results.push({ batchNum, totalBatches, deviceCount: batch.length, success: false, error: err.message });
        }
        setPushResults([...results]);
      }
    } finally {
      setPushing(false);
    }
  };

  const successCount = pushResults?.filter(r => r.success).reduce((sum, r) => sum + r.deviceCount, 0) || 0;
  const failCount = pushResults?.filter(r => !r.success).reduce((sum, r) => sum + r.deviceCount, 0) || 0;
  const activeStateObj = APP_STATES.find(s => s.value === selectedState);

  if (!isOpen) {
    return (
      <button className="btn btn-app-state" onClick={handleOpen} title="Show/Hide Chrome on devices">
        <FontAwesomeIcon icon={faEyeSlash} />
        App Visibility
      </button>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="chrome-config-modal">
        {/* Header */}
        <div className="chrome-config-header">
          <div>
            <h3>
              <FontAwesomeIcon icon={faEye} style={{ marginRight: '0.5rem', color: '#81C784' }} />
              App Visibility Manager
            </h3>
            <p className="chrome-config-subtitle">
              Show, hide, or disable Chrome across multiple devices
            </p>
          </div>
          <button className="modal-close" onClick={handleClose} disabled={pushing}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Steps */}
        <div className="chrome-config-steps">
          <button
            className={`step-btn ${step === 'state' ? 'active' : ''} ${step === 'results' ? 'completed' : ''}`}
            onClick={() => !pushing && setStep('state')}
            disabled={pushing}
          >
            <span className="step-num">1</span>
            <FontAwesomeIcon icon={faEye} />
            Choose State
          </button>
          <div className="step-divider" />
          <button
            className={`step-btn ${step === 'devices' ? 'active' : ''} ${step === 'results' ? 'completed' : ''}`}
            onClick={() => !pushing && step !== 'state' && setStep('devices')}
            disabled={pushing || step === 'state'}
          >
            <span className="step-num">2</span>
            <FontAwesomeIcon icon={faTabletAlt} />
            Select Devices
          </button>
          <div className="step-divider" />
          <button className={`step-btn ${step === 'results' ? 'active' : ''}`} disabled>
            <span className="step-num">3</span>
            <FontAwesomeIcon icon={faPaperPlane} />
            Push & Results
          </button>
        </div>

        {/* Content */}
        <div className="chrome-config-body">
          {error && (
            <div className="chrome-config-error">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              {error}
            </div>
          )}

          {/* Step 1: Choose State */}
          {step === 'state' && (
            <div className="app-state-picker">
              <p className="app-state-picker-label">
                Select the desired state for <code>{PACKAGE_NAME}</code>:
              </p>
              <div className="app-state-options">
                {APP_STATES.map(opt => (
                  <button
                    key={opt.value}
                    className={`app-state-option ${selectedState === opt.value ? 'active' : ''}`}
                    onClick={() => setSelectedState(opt.value)}
                    style={{
                      '--state-color': opt.color,
                      borderColor: selectedState === opt.value ? opt.color : undefined,
                    }}
                  >
                    <FontAwesomeIcon icon={opt.icon} className="app-state-option-icon" style={{ color: opt.color }} />
                    <div className="app-state-option-text">
                      <span className="app-state-option-label">{opt.label}</span>
                      <span className="app-state-option-desc">{opt.desc}</span>
                    </div>
                    {selectedState === opt.value && (
                      <FontAwesomeIcon icon={faCheck} className="app-state-option-check" style={{ color: opt.color }} />
                    )}
                  </button>
                ))}
              </div>
              <div className="config-help-text" style={{ marginTop: '1rem' }}>
                <strong>Show</strong> makes Chrome visible and usable. <strong>Hide</strong> removes it from the launcher but keeps it installed. <strong>Disable</strong> fully disables the app.
              </div>
            </div>
          )}

          {/* Step 2: Device Selection (same pattern as ChromeConfigManager) */}
          {step === 'devices' && (
            <div className="chrome-config-devices-section">
              {loadingDevices ? (
                <div className="chrome-config-loading">
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                  <p>Loading devices from Esper...</p>
                </div>
              ) : (
                <>
                  <div className="device-select-toolbar">
                    <div className="device-search-wrapper">
                      <FontAwesomeIcon icon={faSearch} className="device-search-icon" />
                      <input
                        className="device-search-input"
                        type="text"
                        placeholder="Search devices by name, tag, or person..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="device-select-actions">
                      <button className="btn btn-small btn-secondary" onClick={handleSelectAll}>
                        Select All ({filteredDevices.length})
                      </button>
                      <button className="btn btn-small btn-secondary" onClick={handleDeselectAll}>
                        Clear
                      </button>
                      <button className="btn btn-small btn-secondary" onClick={loadDevices}>
                        <FontAwesomeIcon icon={faSync} />
                      </button>
                    </div>
                  </div>

                  <div className="device-count-bar">
                    <span>{selectedDeviceIds.size} of {devices.length} devices selected</span>
                    <div className="device-count-bar-right">
                      {(searchQuery || stateFilter !== 'ALL') && <span className="filter-notice">Showing {filteredDevices.length} matching</span>}
                      <div className="view-toggle">
                        <button
                          className={`view-toggle-btn ${viewMode === 'discipline' ? 'active' : ''}`}
                          onClick={() => setViewMode('discipline')}
                          title="Group by discipline"
                        >
                          <FontAwesomeIcon icon={faLayerGroup} />
                        </button>
                        <button
                          className={`view-toggle-btn ${viewMode === 'flat' ? 'active' : ''}`}
                          onClick={() => setViewMode('flat')}
                          title="Flat list"
                        >
                          <FontAwesomeIcon icon={faList} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* State Filter Bar */}
                  <div className="state-filter-bar">
                    {!statesLoaded && !loadingStates ? (
                      <button className="btn btn-small btn-load-states" onClick={handleLoadChromeStates}>
                        <FontAwesomeIcon icon={faDownload} />
                        Load Current Chrome States
                      </button>
                    ) : loadingStates ? (
                      <div className="state-loading-progress">
                        <FontAwesomeIcon icon={faSpinner} spin />
                        <span>Loading states... {statesProgress.done}/{statesProgress.total}</span>
                        <div className="state-progress-bar">
                          <div className="state-progress-fill" style={{ width: `${statesProgress.total ? (statesProgress.done / statesProgress.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="state-filter-buttons">
                        <FontAwesomeIcon icon={faFilter} className="state-filter-icon" />
                        {[
                          { key: 'ALL', label: 'All', icon: null },
                          { key: 'HIDE', label: 'Hidden', icon: faEyeSlash, color: '#FFB74D' },
                          { key: 'SHOW', label: 'Shown', icon: faEye, color: '#81C784' },
                          { key: 'DISABLE', label: 'Disabled', icon: faBan, color: '#E57373' },
                        ].map(f => (
                          <button
                            key={f.key}
                            className={`state-filter-btn ${stateFilter === f.key ? 'active' : ''}`}
                            onClick={() => setStateFilter(f.key)}
                            style={stateFilter === f.key && f.color ? { borderColor: f.color, color: f.color } : undefined}
                          >
                            {f.icon && <FontAwesomeIcon icon={f.icon} />}
                            {f.label}
                          </button>
                        ))}
                        <button className="state-filter-btn refresh" onClick={handleLoadChromeStates} title="Refresh states">
                          <FontAwesomeIcon icon={faSync} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="device-checklist">
                    {viewMode === 'flat' ? (
                      filteredDevices.map(device => (
                        <DeviceRow key={device.id} device={device} isSelected={selectedDeviceIds.has(device.id)} onToggle={handleToggleDevice} showDiscipline chromeState={getChromeStateForDevice(device.id)} />
                      ))
                    ) : (
                      groupedDevices.map(group => (
                        <div key={group.key} className="discipline-group">
                          <div className="discipline-group-header" onClick={() => handleToggleGroup(group.key)}>
                            <FontAwesomeIcon icon={collapsedGroups.has(group.key) ? faChevronRight : faChevronDown} className="discipline-chevron" />
                            <span className="discipline-group-label">{group.label}</span>
                            <span className="discipline-group-count">{groupSelectedCount(group.devices)}/{group.devices.length}</span>
                            <div className="discipline-group-actions" onClick={e => e.stopPropagation()}>
                              <button className="discipline-select-btn" onClick={() => isGroupFullySelected(group.devices) ? handleDeselectGroup(group.devices) : handleSelectGroup(group.devices)}>
                                {isGroupFullySelected(group.devices) ? 'Deselect all' : 'Select all'}
                              </button>
                            </div>
                          </div>
                          {!collapsedGroups.has(group.key) && (
                            <div className="discipline-group-body">
                              {group.devices.map(device => (
                                <DeviceRow key={device.id} device={device} isSelected={selectedDeviceIds.has(device.id)} onToggle={handleToggleDevice} chromeState={getChromeStateForDevice(device.id)} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {filteredDevices.length === 0 && !loadingDevices && (
                      <div className="device-checklist-empty">No devices match your search{stateFilter !== 'ALL' ? ` and "${stateFilter}" filter` : ''}.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Results */}
          {step === 'results' && (
            <div className="chrome-config-results-section">
              {pushing && (
                <div className="chrome-config-loading">
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                  <p>Setting Chrome to <strong>{selectedState}</strong> on {selectedDeviceIds.size} devices...</p>
                </div>
              )}
              {!pushing && pushResults && (
                <>
                  <div className="push-results-summary">
                    {failCount === 0 ? (
                      <div className="push-result-banner success">
                        <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                        <div>
                          <h4>App State Updated Successfully</h4>
                          <p>Set Chrome to <strong>{selectedState}</strong> on {successCount} device{successCount !== 1 ? 's' : ''}. Offline devices will receive the update when they come online.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="push-result-banner partial">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                        <div>
                          <h4>Partially Completed</h4>
                          <p>{successCount} succeeded, {failCount} failed.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="push-results-details">
                    {pushResults.map((result, idx) => (
                      <div key={idx} className={`push-result-row ${result.success ? 'success' : 'error'}`}>
                        <FontAwesomeIcon icon={result.success ? faCheckCircle : faTimesCircle} />
                        <span>Batch {result.batchNum}/{result.totalBatches} — {result.deviceCount} device{result.deviceCount !== 1 ? 's' : ''}</span>
                        {result.success && result.requestId && (
                          <span className="request-id" title={result.requestId}>ID: {result.requestId.substring(0, 8)}...</span>
                        )}
                        {result.success && result.status && (
                          <span className="request-id">{result.status.map(s => `${s.state}: ${s.total}`).join(', ')}</span>
                        )}
                        {!result.success && <span className="error-msg">{result.error}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="chrome-config-footer">
          {step === 'state' && (
            <>
              <div className="footer-info">
                <FontAwesomeIcon icon={activeStateObj.icon} style={{ color: activeStateObj.color }} />
                <span>Chrome → {activeStateObj.label}</span>
              </div>
              <button className="btn btn-primary" onClick={() => setStep('devices')}>
                Next: Select Devices
                <FontAwesomeIcon icon={faTabletAlt} />
              </button>
            </>
          )}
          {step === 'devices' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('state')}>
                Back
              </button>
              <button
                className="btn btn-push"
                onClick={() => { if (selectedDeviceIds.size > 0) setShowConfirm(true); }}
                disabled={selectedDeviceIds.size === 0 || pushing}
              >
                <FontAwesomeIcon icon={activeStateObj.icon} />
                {activeStateObj.label} on {selectedDeviceIds.size} Device{selectedDeviceIds.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'results' && !pushing && (
            <>
              <button className="btn btn-secondary" onClick={() => { setPushResults(null); setStep('devices'); }}>
                Push Again
              </button>
              <button className="btn btn-primary" onClick={handleClose}>Done</button>
            </>
          )}
        </div>

        {/* Confirmation */}
        {showConfirm && (
          <div className="chrome-confirm-overlay" onClick={() => setShowConfirm(false)}>
            <div className="chrome-confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon">
                <FontAwesomeIcon icon={activeStateObj.icon} style={{ color: activeStateObj.color, fontSize: '2rem' }} />
              </div>
              <h4>Confirm: {activeStateObj.label} Chrome</h4>
              <p>
                You are about to set Chrome to <strong style={{ color: activeStateObj.color }}>{activeStateObj.label}</strong> on <strong>{selectedDeviceIds.size}</strong> device{selectedDeviceIds.size !== 1 ? 's' : ''}.
              </p>
              <p className="confirm-warning">{activeStateObj.desc}. Offline devices will receive this when they come online within 24 hours.</p>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="btn btn-push" onClick={handleConfirmPush}>
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppStateManager;
