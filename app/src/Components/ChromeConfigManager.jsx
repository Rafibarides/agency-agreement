import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe,
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
  faEdit,
  faCode,
  faSquare,
  faChevronDown,
  faChevronRight,
  faList,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import {
  getAllDevices,
  pushManagedAppConfig,
  isEsperConfigured,
} from '../utils/esperApi';

const DEFAULT_CHROME_CONFIG = {
  URLAllowlist: [
    "https://us3.proofpointessentials.com",
    "https://urldefense.proofpoint.com",
    "http://urldefense.proofpoint.com",
    "https://translate.google.com",
    "https://www.promisepoint.com/hchblogin",
    "https://docusign.com",
    "https://apps.docusign.com",
    "https://na3.docusign.net",
    "http://na3.docusign.net",
    "https://ambercourtal-my.sharepoint.com",
    "https://sharepoint.com",
    "https://ambercourtal.sharepoint.com/",
    "http://ambercourtal.sharepoint.com/",
    "https://login.microsoftonline.com",
    "https://wow.boomlearning.com",
    "https://www.ultimateslp.com",
    "https://nyc.gov",
    "http://nyc.gov",
    "https://wellboundchha.showdme.net",
    "http://wellboundchha.showdme.net",
    "https://iohealth.ai",
    "https://iohealthtech.com",
    "https://portal.iohealthtech.com",
    "https://rafibarides.github.io/agency-agreement/",
    "https://wellboundsig.github.io/clinician/field/",
    "https://wellboundsig.github.io/hub/",
    "https://forms.office.com/Pages/ResponsePage.aspx?id=2BKJsHSvDUqUZ2840rDSfX8iIdkQxk9OoE8O8m86VV1UNENJT044RjhFRDc2M1JSQ0ZSOUhGMTZDMi4u",
    "https://forms.office.com/Pages/ResponsePage.aspx?id=2BKJsHSvDUqUZ2840rDSfX8iIdkQxk9OoE8O8m86VV1UNVBEOFFPN0xCMDVMWkZDWU43NkM0TFNDRS4u"
  ],
  URLBlocklist: ["*"],
  HomepageLocation: "https://wellboundsig.github.io/hub/",
  ForceGoogleSafeSearch: "true",
  IncognitoModeAvailability: "1"
};

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

const DeviceRow = ({ device, isSelected, onToggle, showDiscipline }) => (
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

const ChromeConfigManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [configJson, setConfigJson] = useState(JSON.stringify(DEFAULT_CHROME_CONFIG, null, 2));
  const [jsonError, setJsonError] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('config'); // 'config' | 'devices' | 'results'
  const [viewMode, setViewMode] = useState('discipline'); // 'flat' | 'discipline'
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const textareaRef = useRef(null);

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
    setStep('config');
    setPushResults(null);
    setShowConfirm(false);
  };

  const handleClose = () => {
    if (pushing) return;
    setIsOpen(false);
    setSearchQuery('');
    setShowConfirm(false);
  };

  const validateJson = (text) => {
    try {
      JSON.parse(text);
      setJsonError('');
      return true;
    } catch (e) {
      setJsonError(e.message);
      return false;
    }
  };

  const handleConfigChange = (e) => {
    const val = e.target.value;
    setConfigJson(val);
    validateJson(val);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(configJson);
      setConfigJson(JSON.stringify(parsed, null, 2));
      setJsonError('');
    } catch (e) {
      setJsonError(e.message);
    }
  };

  const handleResetConfig = () => {
    setConfigJson(JSON.stringify(DEFAULT_CHROME_CONFIG, null, 2));
    setJsonError('');
  };

  const filteredDevices = devices.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.alias && d.alias.toLowerCase().includes(q)) ||
      (d.assignedTo && d.assignedTo.toLowerCase().includes(q)) ||
      (d.tags && d.tags.some(t => String(t).toLowerCase().includes(q)))
    );
  });

  const handleSelectAll = () => {
    const allVisible = new Set(selectedDeviceIds);
    filteredDevices.forEach(d => allVisible.add(d.id));
    setSelectedDeviceIds(allVisible);
  };

  const handleDeselectAll = () => {
    const remaining = new Set(selectedDeviceIds);
    filteredDevices.forEach(d => remaining.delete(d.id));
    setSelectedDeviceIds(remaining);
  };

  const handleToggleDevice = (deviceId) => {
    setSelectedDeviceIds(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

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

  const handleToggleGroup = (groupKey) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
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

  const isGroupFullySelected = (groupDevices) => groupDevices.length > 0 && groupDevices.every(d => selectedDeviceIds.has(d.id));
  const isGroupPartiallySelected = (groupDevices) => groupDevices.some(d => selectedDeviceIds.has(d.id)) && !isGroupFullySelected(groupDevices);
  const groupSelectedCount = (groupDevices) => groupDevices.filter(d => selectedDeviceIds.has(d.id)).length;

  const handleProceedToDevices = () => {
    if (!validateJson(configJson)) return;
    setStep('devices');
  };

  const handleBackToConfig = () => {
    setStep('config');
    setShowConfirm(false);
  };

  const handleInitiatePush = () => {
    if (selectedDeviceIds.size === 0) return;
    if (!validateJson(configJson)) return;
    setShowConfirm(true);
  };

  const handleConfirmPush = async () => {
    setShowConfirm(false);
    setPushing(true);
    setPushResults(null);
    setStep('results');

    const deviceIdArray = Array.from(selectedDeviceIds);
    const parsedConfig = JSON.parse(configJson);
    const results = [];

    try {
      for (let i = 0; i < deviceIdArray.length; i += BATCH_SIZE) {
        const batch = deviceIdArray.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(deviceIdArray.length / BATCH_SIZE);

        try {
          const response = await pushManagedAppConfig(batch, PACKAGE_NAME, parsedConfig);
          results.push({
            batchNum,
            totalBatches,
            deviceCount: batch.length,
            success: true,
            requestId: response.id,
            status: response.status,
          });
        } catch (err) {
          results.push({
            batchNum,
            totalBatches,
            deviceCount: batch.length,
            success: false,
            error: err.message,
          });
        }

        setPushResults([...results]);
      }
    } finally {
      setPushing(false);
    }
  };

  const successCount = pushResults?.filter(r => r.success).reduce((sum, r) => sum + r.deviceCount, 0) || 0;
  const failCount = pushResults?.filter(r => !r.success).reduce((sum, r) => sum + r.deviceCount, 0) || 0;

  if (!isOpen) {
    return (
      <button
        className="btn btn-chrome-config"
        onClick={handleOpen}
        title="Manage Chrome Configuration"
      >
        <FontAwesomeIcon icon={faGlobe} />
        Chrome Config
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
              <FontAwesomeIcon icon={faGlobe} style={{ marginRight: '0.5rem', color: '#4285F4' }} />
              Chrome Managed Configuration
            </h3>
            <p className="chrome-config-subtitle">
              Push Chrome URL allowlist/blocklist to multiple devices at once
            </p>
          </div>
          <button className="modal-close" onClick={handleClose} disabled={pushing}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="chrome-config-steps">
          <button
            className={`step-btn ${step === 'config' ? 'active' : ''} ${step === 'results' ? 'completed' : ''}`}
            onClick={() => !pushing && setStep('config')}
            disabled={pushing}
          >
            <span className="step-num">1</span>
            <FontAwesomeIcon icon={faCode} />
            Edit Config
          </button>
          <div className="step-divider" />
          <button
            className={`step-btn ${step === 'devices' ? 'active' : ''} ${step === 'results' ? 'completed' : ''}`}
            onClick={() => !pushing && step !== 'config' && setStep('devices')}
            disabled={pushing || step === 'config'}
          >
            <span className="step-num">2</span>
            <FontAwesomeIcon icon={faTabletAlt} />
            Select Devices
          </button>
          <div className="step-divider" />
          <button
            className={`step-btn ${step === 'results' ? 'active' : ''}`}
            disabled
          >
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

          {/* Step 1: Config Editor */}
          {step === 'config' && (
            <div className="chrome-config-editor-section">
              <div className="config-editor-toolbar">
                <span className="config-editor-label">
                  <FontAwesomeIcon icon={faEdit} style={{ marginRight: '0.4rem' }} />
                  Configuration JSON for <code>{PACKAGE_NAME}</code>
                </span>
                <div className="config-editor-actions">
                  <button className="btn btn-small btn-secondary" onClick={handleFormatJson}>
                    Format
                  </button>
                  <button className="btn btn-small btn-secondary" onClick={handleResetConfig}>
                    Reset Default
                  </button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                className={`config-textarea ${jsonError ? 'has-error' : ''}`}
                value={configJson}
                onChange={handleConfigChange}
                spellCheck={false}
              />
              {jsonError && (
                <div className="config-json-error">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  Invalid JSON: {jsonError}
                </div>
              )}
              <div className="config-help-text">
                Edit the JSON above to set Chrome policies. Common keys: <code>URLAllowlist</code>, <code>URLBlocklist</code>, <code>HomepageLocation</code>, <code>ForceGoogleSafeSearch</code>, <code>IncognitoModeAvailability</code>
              </div>
            </div>
          )}

          {/* Step 2: Device Selection */}
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
                      {searchQuery && <span className="filter-notice">Showing {filteredDevices.length} matching</span>}
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

                  <div className="device-checklist">
                    {viewMode === 'flat' ? (
                      filteredDevices.map(device => (
                        <DeviceRow
                          key={device.id}
                          device={device}
                          isSelected={selectedDeviceIds.has(device.id)}
                          onToggle={handleToggleDevice}
                          showDiscipline
                        />
                      ))
                    ) : (
                      groupedDevices.map(group => (
                        <div key={group.key} className="discipline-group">
                          <div
                            className="discipline-group-header"
                            onClick={() => handleToggleGroup(group.key)}
                          >
                            <FontAwesomeIcon
                              icon={collapsedGroups.has(group.key) ? faChevronRight : faChevronDown}
                              className="discipline-chevron"
                            />
                            <span className="discipline-group-label">{group.label}</span>
                            <span className="discipline-group-count">
                              {groupSelectedCount(group.devices)}/{group.devices.length}
                            </span>
                            <div className="discipline-group-actions" onClick={e => e.stopPropagation()}>
                              {isGroupFullySelected(group.devices) ? (
                                <button
                                  className="discipline-select-btn"
                                  onClick={() => handleDeselectGroup(group.devices)}
                                >
                                  Deselect all
                                </button>
                              ) : (
                                <button
                                  className="discipline-select-btn"
                                  onClick={() => handleSelectGroup(group.devices)}
                                >
                                  Select all
                                </button>
                              )}
                            </div>
                          </div>
                          {!collapsedGroups.has(group.key) && (
                            <div className="discipline-group-body">
                              {group.devices.map(device => (
                                <DeviceRow
                                  key={device.id}
                                  device={device}
                                  isSelected={selectedDeviceIds.has(device.id)}
                                  onToggle={handleToggleDevice}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {filteredDevices.length === 0 && !loadingDevices && (
                      <div className="device-checklist-empty">
                        No devices match your search.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Push Results */}
          {step === 'results' && (
            <div className="chrome-config-results-section">
              {pushing && (
                <div className="chrome-config-loading">
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                  <p>Pushing configuration to {selectedDeviceIds.size} devices...</p>
                  {pushResults && pushResults.length > 0 && (
                    <p className="push-progress-text">
                      Batch {pushResults.length} of {Math.ceil(selectedDeviceIds.size / BATCH_SIZE)} complete
                    </p>
                  )}
                </div>
              )}

              {!pushing && pushResults && (
                <>
                  <div className="push-results-summary">
                    {failCount === 0 ? (
                      <div className="push-result-banner success">
                        <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                        <div>
                          <h4>Configuration Pushed Successfully</h4>
                          <p>
                            Sent to {successCount} device{successCount !== 1 ? 's' : ''} across {pushResults.length} batch{pushResults.length !== 1 ? 'es' : ''}.
                            Offline devices will receive the update when they come online (within 24h).
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="push-result-banner partial">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                        <div>
                          <h4>Partially Completed</h4>
                          <p>
                            {successCount} device{successCount !== 1 ? 's' : ''} succeeded, {failCount} failed.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="push-results-details">
                    {pushResults.map((result, idx) => (
                      <div key={idx} className={`push-result-row ${result.success ? 'success' : 'error'}`}>
                        <FontAwesomeIcon icon={result.success ? faCheckCircle : faTimesCircle} />
                        <span>
                          Batch {result.batchNum}/{result.totalBatches} — {result.deviceCount} device{result.deviceCount !== 1 ? 's' : ''}
                        </span>
                        {result.success && result.requestId && (
                          <span className="request-id" title={result.requestId}>
                            ID: {result.requestId.substring(0, 8)}...
                          </span>
                        )}
                        {result.success && result.status && (
                          <span className="request-id">
                            {result.status.map(s => `${s.state}: ${s.total}`).join(', ')}
                          </span>
                        )}
                        {!result.success && (
                          <span className="error-msg">{result.error}</span>
                        )}
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
          {step === 'config' && (
            <>
              <div className="footer-info">
                <FontAwesomeIcon icon={faGlobe} style={{ opacity: 0.5 }} />
                <span>Package: {PACKAGE_NAME}</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleProceedToDevices}
                disabled={!!jsonError || !configJson.trim()}
              >
                Next: Select Devices
                <FontAwesomeIcon icon={faTabletAlt} />
              </button>
            </>
          )}

          {step === 'devices' && (
            <>
              <button className="btn btn-secondary" onClick={handleBackToConfig}>
                Back to Config
              </button>
              <button
                className="btn btn-push"
                onClick={handleInitiatePush}
                disabled={selectedDeviceIds.size === 0 || pushing}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
                Push to {selectedDeviceIds.size} Device{selectedDeviceIds.size !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {step === 'results' && !pushing && (
            <>
              <button className="btn btn-secondary" onClick={() => { setPushResults(null); setStep('devices'); }}>
                Push Again
              </button>
              <button className="btn btn-primary" onClick={handleClose}>
                Done
              </button>
            </>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="chrome-confirm-overlay" onClick={() => setShowConfirm(false)}>
            <div className="chrome-confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <h4>Confirm Configuration Push</h4>
              <p>
                You are about to push the Chrome managed configuration to <strong>{selectedDeviceIds.size}</strong> device{selectedDeviceIds.size !== 1 ? 's' : ''}.
              </p>
              <p className="confirm-warning">
                This will overwrite the existing Chrome policy on all selected devices. Offline devices will receive the update when they come online within 24 hours.
              </p>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-push" onClick={handleConfirmPush}>
                  <FontAwesomeIcon icon={faPaperPlane} />
                  Confirm Push
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChromeConfigManager;
