// Esper API Configuration
//
// All Esper API calls are proxied through the `worker-esper` Cloudflare Worker
// so the Esper bearer token never leaves the server side.
//
// VITE_ESPER_BASE points at the worker URL (e.g.
// https://worker-esper.support-1e5.workers.dev). The worker's CORS allow-list
// includes both the production subdomain and http://localhost:5173, so the
// same URL works in dev and prod. The fallback `/esper-api` is only used if
// the env var is missing (treat that as a misconfiguration).
const ESPER_ENTERPRISE_ID = import.meta.env.VITE_ESPER_ENTERPRISE_ID;
const ESPER_BASE_URL = import.meta.env.VITE_ESPER_BASE || '/esper-api';

// Device name prefix for Wellbound devices
const DEVICE_NAME_PREFIX = 'ESR-NNV-';

/**
 * Make request to Esper API via the worker proxy.
 * The worker injects the Authorization header — never include it here.
 */
async function esperRequest(endpoint, options = {}) {
  const url = `${ESPER_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Esper API Error:', error);
    throw error;
  }
}

/**
 * Search for a device by exact device name (ESR-NNV-XXXXX)
 */
export async function searchDeviceByName(deviceName) {
  if (!deviceName) return null;

  const endpoint = `/enterprise/${ESPER_ENTERPRISE_ID}/device/?name=${encodeURIComponent(deviceName)}&limit=1`;
  
  try {
    const result = await esperRequest(endpoint);
    if (result.results && result.results.length > 0) {
      return result.results[0];
    }
  } catch (error) {
    console.warn('Search by device name failed:', error.message);
  }
  
  return null;
}

/**
 * Search for a device by Esper code (5-character identifier)
 * Device name format: ESR-NNV-XXXXX
 */
export async function searchDeviceByEsperCode(esperCode) {
  if (!esperCode) return null;

  const deviceName = `${DEVICE_NAME_PREFIX}${esperCode.toUpperCase()}`;
  return await searchDeviceByName(deviceName);
}

/**
 * Search for a device by serial number
 */
export async function searchDeviceBySerial(serialNumber) {
  if (!serialNumber) return null;

  const endpoint = `/enterprise/${ESPER_ENTERPRISE_ID}/device/?serial=${encodeURIComponent(serialNumber)}&limit=1`;
  
  try {
    const result = await esperRequest(endpoint);
    if (result.results && result.results.length > 0) {
      return result.results[0];
    }
  } catch (error) {
    console.warn('Search by serial failed:', error.message);
  }
  
  return null;
}

/**
 * Search for a device by tags (worker ID, name, etc.)
 */
export async function searchDeviceByTags(tagValue) {
  if (!tagValue) return [];

  const endpoint = `/enterprise/${ESPER_ENTERPRISE_ID}/device/?tags=${encodeURIComponent(tagValue)}&limit=10`;
  
  try {
    const result = await esperRequest(endpoint);
    if (result.results && result.results.length > 0) {
      return result.results;
    }
  } catch (error) {
    console.warn('Search by tags failed:', error.message);
  }
  
  return [];
}

/**
 * General search (searches by device name, serial, IMEI, or MAC)
 */
export async function searchDeviceGeneral(searchTerm) {
  if (!searchTerm) return [];

  const endpoint = `/enterprise/${ESPER_ENTERPRISE_ID}/device/?search=${encodeURIComponent(searchTerm)}&limit=10`;
  
  try {
    const result = await esperRequest(endpoint);
    if (result.results && result.results.length > 0) {
      return result.results;
    }
  } catch (error) {
    console.warn('General search failed:', error.message);
  }
  
  return [];
}

/**
 * Get device details by device ID
 */
export async function getDeviceById(deviceId) {
  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const endpoint = `/enterprise/${ESPER_ENTERPRISE_ID}/device/${deviceId}/`;
  return await esperRequest(endpoint);
}

/**
 * Get apps installed on a device
 */
export async function getDeviceApps(deviceId) {
  if (!deviceId) return [];

  try {
    const endpoint = `/enterprise/${ESPER_ENTERPRISE_ID}/device/${deviceId}/app/?limit=100`;
    const result = await esperRequest(endpoint);
    return result.results || [];
  } catch (error) {
    console.warn('Failed to get device apps:', error.message);
    return [];
  }
}

/**
 * Get a specific app's state on a device by package name.
 * @param {string} deviceId
 * @param {string} packageName
 * @returns {Object|null} App info with state, or null if not found
 */
export async function getAppStateOnDevice(deviceId, packageName) {
  if (!deviceId || !packageName) return null;
  try {
    const endpoint = `/enterprise/${ESPER_ENTERPRISE_ID}/device/${deviceId}/app/?package_name=${encodeURIComponent(packageName)}&limit=1`;
    const result = await esperRequest(endpoint);
    if (result.results && result.results.length > 0) {
      const app = result.results[0];
      return {
        state: app.state,
        appName: app.app_name,
        versionName: app.version_name,
        isActive: app.is_active,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch-fetch an app's state across many devices.
 * Processes in parallel batches for performance.
 * @param {Array} devices - Array of {id, ...} device objects
 * @param {string} packageName - App package name
 * @param {function} onProgress - Optional callback(completed, total)
 * @returns {Object} Map of deviceId -> app state info
 */
export async function batchGetAppStates(devices, packageName, onProgress) {
  const results = {};
  const batchSize = 10;

  for (let i = 0; i < devices.length; i += batchSize) {
    const batch = devices.slice(i, i + batchSize);
    await Promise.all(batch.map(async (device) => {
      results[device.id] = await getAppStateOnDevice(device.id, packageName);
    }));
    if (onProgress) onProgress(Math.min(i + batchSize, devices.length), devices.length);
  }

  return results;
}

/**
 * Search for PointCare app on a device
 */
export async function getPointCareAppInfo(deviceId) {
  const apps = await getDeviceApps(deviceId);
  
  // Search for PointCare app - try multiple possible names/packages
  const pointCareApp = apps.find(app => 
    app.app_name?.toLowerCase().includes('pointcare') ||
    app.package_name?.toLowerCase().includes('pointcare') ||
    app.app_name?.toLowerCase().includes('point care')
  );
  
  return pointCareApp || null;
}

/**
 * Get complete device info with multiple fallback search strategies
 * Tries: Esper code -> Serial number -> Worker ID (tags) -> Name (tags) -> General search
 */
export async function getDeviceInfo(esperCode, workerId = null, serialNumber = null, employeeName = null) {
  let device = null;
  let searchMethod = null;
  const searchAttempts = [];

  // Strategy 1: Search by Esper code (most reliable)
  if (esperCode) {
    searchAttempts.push(`Esper code: ${esperCode}`);
    device = await searchDeviceByEsperCode(esperCode);
    if (device) {
      searchMethod = 'esper_code';
    }
  }

  // Strategy 2: Search by serial number
  if (!device && serialNumber) {
    searchAttempts.push(`Serial: ${serialNumber}`);
    device = await searchDeviceBySerial(serialNumber);
    if (device) {
      searchMethod = 'serial_number';
    }
  }

  // Strategy 3: Search by worker ID in tags
  if (!device && workerId) {
    searchAttempts.push(`Worker ID (tags): ${workerId}`);
    const devices = await searchDeviceByTags(workerId);
    if (devices.length > 0) {
      device = devices[0];
      searchMethod = 'worker_id_tag';
    }
  }

  // Strategy 4: Search by employee name in tags
  if (!device && employeeName) {
    // Try last name first (more unique)
    const nameParts = employeeName.split(' ');
    const lastName = nameParts[nameParts.length - 1];
    
    searchAttempts.push(`Name (tags): ${lastName}`);
    const devices = await searchDeviceByTags(lastName);
    if (devices.length > 0) {
      device = devices[0];
      searchMethod = 'name_tag';
    }
    
    // If multiple results or no results, try full name
    if (!device || devices.length > 1) {
      searchAttempts.push(`Full name (tags): ${employeeName}`);
      const fullNameDevices = await searchDeviceByTags(employeeName);
      if (fullNameDevices.length === 1) {
        device = fullNameDevices[0];
        searchMethod = 'full_name_tag';
      }
    }
  }

  // Strategy 5: General search with serial number
  if (!device && serialNumber) {
    searchAttempts.push(`General search: ${serialNumber}`);
    const devices = await searchDeviceGeneral(serialNumber);
    if (devices.length > 0) {
      device = devices[0];
      searchMethod = 'general_search';
    }
  }

  if (!device) {
    return {
      found: false,
      error: 'Device not found in Esper',
      searchAttempts,
      searchedWith: { esperCode, workerId, serialNumber, employeeName }
    };
  }

  // Get PointCare app info
  let pointCareApp = null;
  let allApps = [];
  try {
    allApps = await getDeviceApps(device.id);
    pointCareApp = allApps.find(app => 
      app.app_name?.toLowerCase().includes('pointcare') ||
      app.package_name?.toLowerCase().includes('pointcare') ||
      app.app_name?.toLowerCase().includes('point care')
    );
  } catch (error) {
    console.warn('Failed to get app info:', error.message);
  }

  return {
    found: true,
    searchMethod,
    searchAttempts,
    device: {
      id: device.id,
      name: device.device_name,
      aliasName: device.alias_name,
      state: device.state,
      status: device.status,
      tags: device.tags || [],
      apiLevel: device.api_level,
      softwareInfo: device.softwareInfo,
      hardwareInfo: device.hardwareInfo,
      networkInfo: device.networkInfo,
      memoryInfo: device.memoryInfo,
      serialNumber: device.hardwareInfo?.serialNumber || device.suid,
    },
    pointCareApp: pointCareApp ? {
      name: pointCareApp.app_name,
      packageName: pointCareApp.package_name,
      versionName: pointCareApp.version_name,
      versionCode: pointCareApp.version_code,
      state: pointCareApp.state,
      isActive: pointCareApp.is_active,
    } : null,
    totalApps: allApps.length
  };
}

/**
 * Format device state for display
 */
export function formatDeviceState(state) {
  const stateMap = {
    1: 'Active',
    10: 'Inactive',
    20: 'Disabled',
    30: 'Provisioning Pending',
    40: 'Provisioning In Progress',
    50: 'Wiped',
    60: 'Under Maintenance',
  };
  
  return stateMap[state] || state || 'Unknown';
}

/**
 * Check if Esper API is configured.
 * The API key now lives in the worker — we just need the enterprise ID and
 * a base URL (defaults to `/esper-api` in dev).
 */
export function isEsperConfigured() {
  return !!(ESPER_ENTERPRISE_ID && ESPER_BASE_URL);
}

/**
 * Get all devices from Esper (paginated)
 */
export async function getAllDevices(limit = 100) {
  const allDevices = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const endpoint = `/enterprise/${ESPER_ENTERPRISE_ID}/device/?limit=${limit}&offset=${offset}`;
    
    try {
      const result = await esperRequest(endpoint);
      const devices = result.results || [];
      allDevices.push(...devices);
      
      // Check if there are more pages
      hasMore = result.next !== null && devices.length === limit;
      offset += limit;
      
      // Safety limit to prevent infinite loops
      if (allDevices.length > 5000) {
        console.warn('Reached device limit of 5000');
        break;
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      hasMore = false;
    }
  }

  return allDevices;
}

/**
 * Extract person identifier from device tags
 * Returns Worker ID (numeric) or name tag
 */
function extractPersonIdentifier(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  
  // First try to find Worker ID (numeric tag)
  for (const tag of tags) {
    const trimmed = String(tag).trim();
    if (/^\d{4,6}$/.test(trimmed)) {
      return { type: 'workerId', value: trimmed };
    }
  }
  
  // Fall back to name tag (non-numeric, non-title)
  const TITLE_ABBREVS = ['RN', 'LPN', 'PT', 'PTA', 'OT', 'COTA', 'ST', 'SLP'];
  for (const tag of tags) {
    const trimmed = String(tag).trim();
    if (!/^\d+$/.test(trimmed) && !TITLE_ABBREVS.includes(trimmed.toUpperCase()) && trimmed.length > 2) {
      return { type: 'name', value: trimmed };
    }
  }
  
  return null;
}

/**
 * Extract title from tags
 */
function extractTitleFromDeviceTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  
  const TITLE_MAP = {
    'RN': 'RN',
    'LPN': 'LPN',
    'PT': 'PT',
    'PTA': 'PTA',
    'OT': 'OT',
    'COTA': 'COTA',
    'ST': 'ST',
    'SLP': 'ST'
  };
  
  for (const tag of tags) {
    const upper = String(tag).trim().toUpperCase();
    if (TITLE_MAP[upper]) {
      return TITLE_MAP[upper];
    }
  }
  
  return null;
}

/**
 * Extract name from tags
 */
function extractNameFromDeviceTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  
  const TITLE_ABBREVS = ['RN', 'LPN', 'PT', 'PTA', 'OT', 'COTA', 'ST', 'SLP'];
  
  for (const tag of tags) {
    const trimmed = String(tag).trim();
    // Skip numeric (worker ID) and title abbreviations
    if (!/^\d+$/.test(trimmed) && !TITLE_ABBREVS.includes(trimmed.toUpperCase()) && trimmed.length > 2) {
      return trimmed;
    }
  }
  
  return null;
}

/**
 * Get report of staff with multiple devices
 * Groups devices by person (using Worker ID or name from tags)
 * Returns people who have 2 or more devices
 */
export async function getMultipleDevicesReport() {
  const devices = await getAllDevices();
  
  // Group devices by person
  const personDevices = {};
  
  for (const device of devices) {
    const identifier = extractPersonIdentifier(device.tags);
    if (!identifier) continue; // Skip devices without person identification
    
    const key = `${identifier.type}:${identifier.value}`;
    
    if (!personDevices[key]) {
      personDevices[key] = {
        identifier: identifier.value,
        identifierType: identifier.type,
        name: extractNameFromDeviceTags(device.tags) || identifier.value,
        title: extractTitleFromDeviceTags(device.tags),
        workerId: identifier.type === 'workerId' ? identifier.value : null,
        devices: []
      };
    }
    
    // Update name if we find it
    const name = extractNameFromDeviceTags(device.tags);
    if (name && !personDevices[key].name.includes(' ')) {
      personDevices[key].name = name;
    }
    
    // Update worker ID if we find it
    const workerId = extractPersonIdentifier(device.tags);
    if (workerId?.type === 'workerId' && !personDevices[key].workerId) {
      personDevices[key].workerId = workerId.value;
    }
    
    // Add device info
    personDevices[key].devices.push({
      id: device.id,
      deviceName: device.device_name,
      aliasName: device.alias_name,
      serialNumber: device.hardwareInfo?.serialNumber || device.suid,
      model: device.hardwareInfo?.model,
      brand: device.hardwareInfo?.brand,
      state: device.state,
      lastSeen: device.softwareInfo?.lastSeen,
      provisionedDate: device.created_on,
      androidVersion: device.softwareInfo?.androidVersion,
      tags: device.tags
    });
  }
  
  // Filter to only people with 2+ devices
  const multipleDevicesPeople = Object.values(personDevices)
    .filter(person => person.devices.length >= 2)
    .sort((a, b) => b.devices.length - a.devices.length); // Sort by device count descending
  
  return {
    totalDevices: devices.length,
    totalPeopleWithMultiple: multipleDevicesPeople.length,
    people: multipleDevicesPeople,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Determine if a device has cellular/5G capability
 * Cellular devices have IMEI numbers, WiFi-only devices don't
 */
function isCellularDevice(device) {
  // Check for IMEI - cellular devices have IMEI, WiFi-only don't
  const hasImei = !!(
    device.imei1 || 
    device.imei2 || 
    device.networkInfo?.imei1 || 
    device.networkInfo?.imei2 ||
    (device.networkInfo?.imeiList && device.networkInfo.imeiList.length > 0)
  );
  
  // Check for cellular network info
  const hasCellularInfo = !!(
    device.networkInfo?.cellularNetworkType ||
    device.networkInfo?.phoneNumber ||
    device.networkInfo?.simOperator ||
    device.networkInfo?.simOperatorName
  );
  
  return hasImei || hasCellularInfo;
}

/**
 * Get connectivity type for a device
 */
function getConnectivityType(device) {
  const cellular = isCellularDevice(device);
  
  // Try to determine if it's 5G vs LTE
  const networkType = device.networkInfo?.cellularNetworkType?.toUpperCase() || '';
  
  if (cellular) {
    if (networkType.includes('5G') || networkType.includes('NR')) {
      return '5G';
    } else if (networkType.includes('LTE') || networkType.includes('4G')) {
      return 'LTE';
    }
    return 'Cellular'; // Generic cellular
  }
  
  return 'WiFi';
}

/**
 * Get report of devices categorized by connectivity (5G/LTE/Cellular vs WiFi)
 * Groups devices by connectivity type and includes assigned person info
 */
export async function getCellularDeviceReport() {
  const devices = await getAllDevices();
  
  // Debug: log first cellular device's network fields to find phone number location
  const firstCellular = devices.find(d => isCellularDevice(d));
  if (firstCellular) {
    console.log('Sample cellular device raw network fields:', {
      networkInfo: firstCellular.networkInfo,
      network_info: firstCellular.network_info,
      phone_number_1: firstCellular.phone_number_1,
      phone_number_2: firstCellular.phone_number_2,
      allTopLevelKeys: Object.keys(firstCellular).filter(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('network') || k.toLowerCase().includes('iccid')),
    });
  }

  const cellularDevices = [];
  const wifiDevices = [];
  
  for (const device of devices) {
    const connectivityType = getConnectivityType(device);
    const personInfo = extractPersonIdentifier(device.tags);
    const name = extractNameFromDeviceTags(device.tags);
    const title = extractTitleFromDeviceTags(device.tags);
    const workerId = personInfo?.type === 'workerId' ? personInfo.value : null;
    
    const deviceRecord = {
      id: device.id,
      deviceName: device.device_name,
      aliasName: device.alias_name,
      serialNumber: device.hardwareInfo?.serialNumber || device.suid,
      model: device.hardwareInfo?.model,
      brand: device.hardwareInfo?.brand,
      state: device.state,
      lastSeen: device.softwareInfo?.lastSeen,
      provisionedDate: device.created_on,
      androidVersion: device.softwareInfo?.androidVersion,
      connectivityType,
      // Network details for cellular
      imei: device.imei1 || device.networkInfo?.imei1 || device.network_info?.imei1 || null,
      imei2: device.imei2 || device.networkInfo?.imei2 || device.network_info?.imei2 || null,
      phoneNumber:
        device.networkInfo?.phoneNumber ||
        device.networkInfo?.phone_number_1 ||
        device.networkInfo?.phone_number_2 ||
        device.network_info?.phone_number_1 ||
        device.network_info?.phone_number_2 ||
        device.phone_number_1 ||
        device.phone_number_2 ||
        null,
      phoneNumber2:
        device.networkInfo?.phone_number_2 ||
        device.network_info?.phone_number_2 ||
        device.phone_number_2 ||
        null,
      simOperator: device.networkInfo?.simOperatorName || device.networkInfo?.simOperator || device.network_info?.simOperatorName || null,
      cellularNetworkType: device.networkInfo?.cellularNetworkType || device.network_info?.cellularNetworkType || null,
      iccid: device.networkInfo?.iccid1 || device.network_info?.iccid1 || device.iccid1 || null,
      // Person info
      assignedTo: name || (personInfo?.value) || null,
      workerId: workerId,
      title: title,
      tags: device.tags || []
    };
    
    if (connectivityType === 'WiFi') {
      wifiDevices.push(deviceRecord);
    } else {
      cellularDevices.push(deviceRecord);
    }
  }
  
  // Sort by assigned person name
  const sortByName = (a, b) => {
    const nameA = (a.assignedTo || 'ZZZ').toLowerCase();
    const nameB = (b.assignedTo || 'ZZZ').toLowerCase();
    return nameA.localeCompare(nameB);
  };
  
  cellularDevices.sort(sortByName);
  wifiDevices.sort(sortByName);
  
  // Count by specific type
  const fiveGCount = cellularDevices.filter(d => d.connectivityType === '5G').length;
  const lteCount = cellularDevices.filter(d => d.connectivityType === 'LTE').length;
  const genericCellularCount = cellularDevices.filter(d => d.connectivityType === 'Cellular').length;
  
  return {
    totalDevices: devices.length,
    cellularCount: cellularDevices.length,
    wifiCount: wifiDevices.length,
    fiveGCount,
    lteCount,
    genericCellularCount,
    cellularDevices,
    wifiDevices,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Extract last seen date from device object - checks all possible Esper API field locations
 */
function extractLastSeenDate(device) {
  // Check all possible field locations in order of reliability
  // updated_on is typically when device last contacted the Esper server
  const possibleFields = [
    device.updated_on,  // Most reliable - when device record was last updated
    device.softwareInfo?.lastHeartbeatTime,
    device.softwareInfo?.lastSeen,
    device.softwareInfo?.last_seen,
    device.networkInfo?.lastSeen,
    device.networkInfo?.last_seen,
    device.status?.lastSeen,
    device.status?.last_seen,
    device.statusTime,
    device.status_time,
    device.last_seen,
    device.lastSeen,
  ];
  
  for (const field of possibleFields) {
    if (field) {
      const date = new Date(field);
      if (!isNaN(date.getTime())) {
        return { dateStr: field, date };
      }
    }
  }
  
  return null;
}

/**
 * Get devices that haven't been seen in a specified number of months
 * @param {number} months - Number of months of inactivity (default: 5)
 * @returns {Object} Report with stale devices
 */
export async function getStaleDevices(months = 5) {
  const devices = await getAllDevices();
  
  // Calculate cutoff date (X months ago from today)
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  
  const staleDevices = [];
  let devicesWithLastSeen = 0;
  let devicesWithoutLastSeen = 0;
  
  // Debug: Log key fields to find lastSeen
  if (devices.length > 0) {
    const d = devices[0];
    console.log('Key device fields:', {
      updated_on: d.updated_on,
      created_on: d.created_on,
      provisioned_on: d.provisioned_on,
      softwareInfo: d.softwareInfo,
      networkInfo: d.networkInfo
    });
  }
  
  for (const device of devices) {
    const lastSeenInfo = extractLastSeenDate(device);
    
    // Skip devices without a last seen date
    if (!lastSeenInfo) {
      devicesWithoutLastSeen++;
      continue;
    }
    
    const { dateStr: lastSeenStr, date: lastSeenDate } = lastSeenInfo;
    
    // Skip if the date is in the future (data error)
    if (lastSeenDate > new Date()) {
      continue;
    }
    
    devicesWithLastSeen++;
    
    // Check if last seen is before the cutoff date (i.e., inactive for > X months)
    if (lastSeenDate < cutoffDate) {
      const personInfo = extractPersonIdentifier(device.tags);
      const name = extractNameFromDeviceTags(device.tags);
      const title = extractTitleFromDeviceTags(device.tags);
      
      // Calculate days since last seen
      const now = new Date();
      const diffTime = Math.abs(now - lastSeenDate);
      const daysSinceLastSeen = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      staleDevices.push({
        id: device.id,
        deviceName: device.device_name,
        aliasName: device.alias_name,
        serialNumber: device.hardwareInfo?.serialNumber || device.suid,
        model: device.hardwareInfo?.model,
        brand: device.hardwareInfo?.brand,
        state: device.state,
        lastSeen: lastSeenStr,
        lastSeenFormatted: lastSeenDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        daysSinceLastSeen,
        assignedTo: name || (personInfo?.value) || null,
        workerId: personInfo?.type === 'workerId' ? personInfo.value : null,
        title: title,
        tags: device.tags || []
      });
    }
  }
  
  // Sort by days since last seen (most stale first)
  staleDevices.sort((a, b) => b.daysSinceLastSeen - a.daysSinceLastSeen);
  
  return {
    totalDevices: devices.length,
    devicesWithActivityData: devicesWithLastSeen,
    devicesWithoutActivityData: devicesWithoutLastSeen,
    staleCount: staleDevices.length,
    monthsThreshold: months,
    cutoffDate: cutoffDate.toISOString(),
    staleDevices,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Get devices grouped by practice/title with PointCare app info
 * Returns counts by role and detailed device list for drill-down
 */
export async function getDevicesByPractice() {
  const devices = await getAllDevices();
  
  // Practice/title mapping
  const PRACTICE_MAP = {
    'RN': { name: 'Registered Nurse', abbrev: 'RN' },
    'LPN': { name: 'Licensed Practical Nurse', abbrev: 'LPN' },
    'PT': { name: 'Physical Therapist', abbrev: 'PT' },
    'PTA': { name: 'Physical Therapist Assistant', abbrev: 'PTA' },
    'OT': { name: 'Occupational Therapist', abbrev: 'OT' },
    'COTA': { name: 'Certified Occupational Therapy Assistant', abbrev: 'COTA' },
    'ST': { name: 'Speech Therapist', abbrev: 'ST' },
    'SLP': { name: 'Speech Therapist', abbrev: 'ST' },
  };
  
  // Group devices by practice
  const byPractice = {};
  const unassigned = [];
  
  for (const device of devices) {
    const title = extractTitleFromDeviceTags(device.tags);
    const name = extractNameFromDeviceTags(device.tags);
    const personInfo = extractPersonIdentifier(device.tags);
    const workerId = personInfo?.type === 'workerId' ? personInfo.value : null;
    
    const deviceRecord = {
      id: device.id,
      deviceName: device.device_name,
      aliasName: device.alias_name,
      serialNumber: device.hardwareInfo?.serialNumber || device.suid,
      model: device.hardwareInfo?.model,
      brand: device.hardwareInfo?.brand,
      state: device.state,
      lastSeen: device.softwareInfo?.lastSeen,
      assignedTo: name || (personInfo?.value) || null,
      workerId: workerId,
      title: title,
      tags: device.tags || [],
      // PointCare info will be populated on drill-down
      pointCareVersion: null,
      pointCareLoaded: false
    };
    
    if (title && PRACTICE_MAP[title]) {
      const practiceKey = PRACTICE_MAP[title].abbrev;
      if (!byPractice[practiceKey]) {
        byPractice[practiceKey] = {
          abbrev: practiceKey,
          name: PRACTICE_MAP[title].name,
          count: 0,
          devices: []
        };
      }
      byPractice[practiceKey].count++;
      byPractice[practiceKey].devices.push(deviceRecord);
    } else {
      unassigned.push(deviceRecord);
    }
  }
  
  // Sort devices within each practice by name
  Object.values(byPractice).forEach(practice => {
    practice.devices.sort((a, b) => {
      const nameA = (a.assignedTo || 'ZZZ').toLowerCase();
      const nameB = (b.assignedTo || 'ZZZ').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });
  
  // Sort practices by count (descending)
  const sortedPractices = Object.values(byPractice).sort((a, b) => b.count - a.count);
  
  return {
    totalDevices: devices.length,
    assignedCount: devices.length - unassigned.length,
    unassignedCount: unassigned.length,
    practices: sortedPractices,
    unassigned: unassigned,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Get PointCare app info for a list of devices
 * @param {Array} deviceIds - Array of device IDs to fetch PointCare info for
 * @returns {Object} Map of deviceId -> pointCareInfo
 */
export async function getPointCareForDevices(deviceIds) {
  const results = {};
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < deviceIds.length; i += batchSize) {
    const batch = deviceIds.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (deviceId) => {
      try {
        const apps = await getDeviceApps(deviceId);
        const pointCareApp = apps.find(app => 
          app.app_name?.toLowerCase().includes('pointcare') ||
          app.package_name?.toLowerCase().includes('pointcare') ||
          app.app_name?.toLowerCase().includes('point care')
        );
        
        results[deviceId] = pointCareApp ? {
          version: pointCareApp.version_name,
          versionCode: pointCareApp.version_code,
          packageName: pointCareApp.package_name,
          state: pointCareApp.state,
          isActive: pointCareApp.is_active
        } : null;
      } catch (err) {
        console.warn(`Failed to get apps for device ${deviceId}:`, err.message);
        results[deviceId] = null;
      }
    }));
  }
  
  return results;
}

/**
 * Push managed app configuration to one or more devices via Esper command API.
 * Format matches Esper's official sample: https://github.com/esper-io/esper-api-sample-code
 * managedAppConfigurations goes directly under custom_settings_config.
 * @param {string[]} deviceIds - Array of device UUIDs
 * @param {string} packageName - App package name (e.g. "com.android.chrome")
 * @param {Object} configJson - The managed configuration JSON object
 * @returns {Object} Command response with request ID
 */
export async function pushManagedAppConfig(deviceIds, packageName, configJson) {
  if (!deviceIds || deviceIds.length === 0) {
    throw new Error('At least one device must be selected');
  }
  if (!packageName) {
    throw new Error('Package name is required');
  }
  if (!configJson || typeof configJson !== 'object') {
    throw new Error('Configuration must be a valid JSON object');
  }

  const endpoint = `/v0/enterprise/${ESPER_ENTERPRISE_ID}/command/`;

  const payload = {
    command_type: 'DEVICE',
    device_type: 'all',
    devices: deviceIds,
    command: 'UPDATE_DEVICE_CONFIG',
    command_args: {
      custom_settings_config: {
        managedAppConfigurations: {
          [packageName]: configJson
        }
      }
    },
    schedule: 'IMMEDIATE'
  };

  console.log('Esper command payload:', JSON.stringify(payload, null, 2));

  const response = await esperRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  console.log('Esper command response:', JSON.stringify(response, null, 2));
  return response;
}

/**
 * Get the status of a previously issued command request.
 * @param {string} requestId - The command request ID
 * @returns {Object} Status details including per-device states
 */
export async function getCommandStatus(requestId) {
  if (!requestId) throw new Error('Request ID is required');
  const endpoint = `/v0/enterprise/${ESPER_ENTERPRISE_ID}/command/${requestId}/status/`;
  return await esperRequest(endpoint);
}

/**
 * Set the app state (SHOW/HIDE/DISABLE) on one or more devices.
 * Uses the SET_APP_STATE command.
 * @param {string[]} deviceIds - Array of device UUIDs
 * @param {string} packageName - App package name (e.g. "com.android.chrome")
 * @param {string} appState - One of: SHOW, HIDE, DISABLE, LAUNCHABLE_BUT_HIDDEN
 * @returns {Object} Command response with request ID
 */
export async function setAppState(deviceIds, packageName, appState) {
  if (!deviceIds || deviceIds.length === 0) {
    throw new Error('At least one device must be selected');
  }
  if (!packageName) {
    throw new Error('Package name is required');
  }
  const validStates = ['SHOW', 'HIDE', 'DISABLE', 'LAUNCHABLE_BUT_HIDDEN'];
  if (!validStates.includes(appState)) {
    throw new Error(`Invalid app state. Must be one of: ${validStates.join(', ')}`);
  }

  const endpoint = `/v0/enterprise/${ESPER_ENTERPRISE_ID}/command/`;

  const payload = {
    command_type: 'DEVICE',
    device_type: 'all',
    devices: deviceIds,
    command: 'SET_APP_STATE',
    command_args: {
      app_state: appState,
      package_name: packageName,
    },
    schedule: 'IMMEDIATE',
  };

  console.log('Esper SET_APP_STATE payload:', JSON.stringify(payload, null, 2));

  const response = await esperRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  console.log('Esper SET_APP_STATE response:', JSON.stringify(response, null, 2));
  return response;
}

export default {
  searchDeviceByName,
  searchDeviceByEsperCode,
  searchDeviceBySerial,
  searchDeviceByTags,
  searchDeviceGeneral,
  getDeviceById,
  getDeviceApps,
  getPointCareAppInfo,
  getDeviceInfo,
  formatDeviceState,
  isEsperConfigured,
  getAllDevices,
  getMultipleDevicesReport,
  getCellularDeviceReport,
  getStaleDevices,
  getDevicesByPractice,
  getPointCareForDevices,
  pushManagedAppConfig,
  getCommandStatus,
  setAppState,
  getAppStateOnDevice,
  batchGetAppStates,
};
