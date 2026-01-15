import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faTabletAlt,
  faMobileAlt,
  faWifi,
  faMemory,
  faCheckCircle,
  faExclamationCircle,
  faExclamationTriangle,
  faCopy,
  faCheck,
  faSync
} from '@fortawesome/free-solid-svg-icons';
import { getDeviceInfo, formatDeviceState, isEsperConfigured } from '../utils/esperApi';

const DeviceInfoModal = ({ agreement, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const esperCode = agreement['Esper Identifier Code'];
  const workerId = agreement['Worker ID'];
  const serialNumber = agreement['Serial Number'];
  const employeeName = agreement.Name;

  useEffect(() => {
    fetchDeviceInfo();
  }, [esperCode, workerId, serialNumber, employeeName]);

  const fetchDeviceInfo = async () => {
    setLoading(true);
    setError(null);

    if (!isEsperConfigured()) {
      setError('Esper API is not configured. Please check environment variables.');
      setLoading(false);
      return;
    }

    // Check if we have ANY searchable info
    if (!esperCode && !workerId && !serialNumber && !employeeName) {
      setError('No searchable information available for this agreement.');
      setLoading(false);
      return;
    }

    try {
      // Pass all available search parameters for fallback strategies
      const info = await getDeviceInfo(esperCode, workerId, serialNumber, employeeName);
      setDeviceInfo(info);
      
      if (!info.found) {
        const attempts = info.searchAttempts?.join(', ') || 'none';
        setError(`Device not found. Tried: ${attempts}`);
      }
    } catch (err) {
      console.error('Failed to fetch device info:', err);
      setError(err.message || 'Failed to fetch device information');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, fieldId) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const CopyableValue = ({ label, value, fieldId }) => {
    if (!value) return null;
    
    return (
      <div className="device-info-row">
        <span className="device-info-label">{label}</span>
        <span className="device-info-value">
          {value}
          <button
            className="copy-btn"
            onClick={() => copyToClipboard(value, fieldId)}
            title="Copy to clipboard"
          >
            <FontAwesomeIcon 
              icon={copiedField === fieldId ? faCheck : faCopy} 
              size="xs"
            />
          </button>
        </span>
      </div>
    );
  };

  const getStateColor = (state) => {
    if (state === 1 || state === 'Active') return '#4ade80'; // Green
    if (state === 10 || state === 'Inactive') return '#f87171'; // Red
    return '#fbbf24'; // Yellow for other states
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="device-info-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="device-info-header">
          <h3>
            <FontAwesomeIcon icon={faTabletAlt} style={{ marginRight: '0.5rem' }} />
            Device Information
          </h3>
          <button className="modal-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="device-info-content">
          {/* Agreement Info */}
          <div className="device-info-section">
            <h4>Agreement Details</h4>
            <div className="device-info-row">
              <span className="device-info-label">Employee</span>
              <span className="device-info-value">{agreement.Name || 'N/A'}</span>
            </div>
            <CopyableValue label="Worker ID" value={workerId} fieldId="worker-id" />
            <CopyableValue label="Esper Code" value={esperCode} fieldId="esper-code" />
            <CopyableValue label="Serial Number" value={agreement['Serial Number']} fieldId="serial" />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="device-info-loading">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" />
              <p>Fetching device information from Esper...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="device-info-error">
              <FontAwesomeIcon icon={faExclamationCircle} size="2x" />
              <p>{error}</p>
              <button className="btn btn-secondary btn-small" onClick={fetchDeviceInfo}>
                <FontAwesomeIcon icon={faSync} /> Retry
              </button>
            </div>
          )}

          {/* Device Info */}
          {!loading && deviceInfo?.found && (
            <>
              {/* Device Status */}
              <div className="device-info-section">
                <h4>
                  <FontAwesomeIcon icon={faMobileAlt} style={{ marginRight: '0.5rem' }} />
                  Device Status
                </h4>
                <div className="device-info-row">
                  <span className="device-info-label">Device Name</span>
                  <span className="device-info-value">{deviceInfo.device.name || 'N/A'}</span>
                </div>
                {deviceInfo.device.aliasName && (
                  <div className="device-info-row">
                    <span className="device-info-label">Alias</span>
                    <span className="device-info-value">{deviceInfo.device.aliasName}</span>
                  </div>
                )}
                <div className="device-info-row">
                  <span className="device-info-label">State</span>
                  <span className="device-info-value">
                    <span 
                      className="device-state-badge"
                      style={{ backgroundColor: getStateColor(deviceInfo.device.state) }}
                    >
                      {formatDeviceState(deviceInfo.device.state)}
                    </span>
                  </span>
                </div>
                <CopyableValue 
                  label="Device ID" 
                  value={deviceInfo.device.id} 
                  fieldId="device-id" 
                />
                {deviceInfo.device.tags?.length > 0 && (
                  <div className="device-info-row">
                    <span className="device-info-label">Tags</span>
                    <span className="device-info-value device-tags">
                      {deviceInfo.device.tags.map((tag, i) => (
                        <span key={i} className="device-tag">{tag}</span>
                      ))}
                    </span>
                  </div>
                )}
              </div>

              {/* PointCare App Info */}
              <div className="device-info-section">
                <h4>
                  <FontAwesomeIcon 
                    icon={deviceInfo.pointCareApp ? faCheckCircle : faExclamationTriangle} 
                    style={{ 
                      marginRight: '0.5rem',
                      color: deviceInfo.pointCareApp ? '#4ade80' : '#fbbf24'
                    }} 
                  />
                  PointCare App
                </h4>
                {deviceInfo.pointCareApp ? (
                  <>
                    <div className="device-info-row">
                      <span className="device-info-label">App Name</span>
                      <span className="device-info-value">{deviceInfo.pointCareApp.name}</span>
                    </div>
                    <div className="device-info-row highlight">
                      <span className="device-info-label">Version</span>
                      <span className="device-info-value version">
                        {deviceInfo.pointCareApp.versionName || deviceInfo.pointCareApp.versionCode || 'N/A'}
                      </span>
                    </div>
                    {deviceInfo.pointCareApp.packageName && (
                      <div className="device-info-row">
                        <span className="device-info-label">Package</span>
                        <span className="device-info-value small">{deviceInfo.pointCareApp.packageName}</span>
                      </div>
                    )}
                    <div className="device-info-row">
                      <span className="device-info-label">Status</span>
                      <span className="device-info-value">
                        <span 
                          className="device-state-badge"
                          style={{ 
                            backgroundColor: deviceInfo.pointCareApp.isActive ? '#4ade80' : '#f87171' 
                          }}
                        >
                          {deviceInfo.pointCareApp.state || (deviceInfo.pointCareApp.isActive ? 'Active' : 'Inactive')}
                        </span>
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="device-info-warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    PointCare app not found on this device
                  </div>
                )}
              </div>

              {/* Hardware/Software Info */}
              {(deviceInfo.device.softwareInfo || deviceInfo.device.hardwareInfo) && (
                <div className="device-info-section">
                  <h4>
                    <FontAwesomeIcon icon={faMemory} style={{ marginRight: '0.5rem' }} />
                    System Info
                  </h4>
                  {deviceInfo.device.apiLevel && (
                    <div className="device-info-row">
                      <span className="device-info-label">Android API Level</span>
                      <span className="device-info-value">{deviceInfo.device.apiLevel}</span>
                    </div>
                  )}
                  {deviceInfo.device.softwareInfo?.androidVersion && (
                    <div className="device-info-row">
                      <span className="device-info-label">Android Version</span>
                      <span className="device-info-value">{deviceInfo.device.softwareInfo.androidVersion}</span>
                    </div>
                  )}
                  {deviceInfo.device.hardwareInfo?.brand && (
                    <div className="device-info-row">
                      <span className="device-info-label">Brand</span>
                      <span className="device-info-value">{deviceInfo.device.hardwareInfo.brand}</span>
                    </div>
                  )}
                  {deviceInfo.device.hardwareInfo?.model && (
                    <div className="device-info-row">
                      <span className="device-info-label">Model</span>
                      <span className="device-info-value">{deviceInfo.device.hardwareInfo.model}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Network Info */}
              {deviceInfo.device.networkInfo && (
                <div className="device-info-section">
                  <h4>
                    <FontAwesomeIcon icon={faWifi} style={{ marginRight: '0.5rem' }} />
                    Network Info
                  </h4>
                  {deviceInfo.device.networkInfo.wifiMacAddress && (
                    <CopyableValue 
                      label="WiFi MAC" 
                      value={deviceInfo.device.networkInfo.wifiMacAddress} 
                      fieldId="wifi-mac" 
                    />
                  )}
                  {deviceInfo.device.networkInfo.imei && (
                    <CopyableValue 
                      label="IMEI" 
                      value={deviceInfo.device.networkInfo.imei} 
                      fieldId="imei" 
                    />
                  )}
                </div>
              )}

              {/* Search Method Info */}
              <div className="device-info-footer">
                Found via: {
                  deviceInfo.searchMethod === 'esper_code' ? 'Esper Code' :
                  deviceInfo.searchMethod === 'serial_number' ? 'Serial Number' :
                  deviceInfo.searchMethod === 'worker_id_tag' ? 'Worker ID (tags)' :
                  deviceInfo.searchMethod === 'name_tag' ? 'Name (tags)' :
                  deviceInfo.searchMethod === 'full_name_tag' ? 'Full Name (tags)' :
                  deviceInfo.searchMethod === 'general_search' ? 'General Search' :
                  deviceInfo.searchMethod
                }
                {deviceInfo.totalApps > 0 && ` • ${deviceInfo.totalApps} apps installed`}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceInfoModal;
