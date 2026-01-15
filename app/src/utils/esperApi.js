// Esper API Configuration
const ESPER_API_KEY = import.meta.env.VITE_ESPER_API_KEY;
const ESPER_ENTERPRISE_ID = import.meta.env.VITE_ESPER_ENTERPRISE_ID;

// Use proxy in development to avoid CORS issues
// In production, you'd need a backend proxy or serverless function
const ESPER_BASE_URL = '/esper-api';

// Device name prefix for Wellbound devices
const DEVICE_NAME_PREFIX = 'ESR-NNV-';

/**
 * Make authenticated request to Esper API
 */
async function esperRequest(endpoint, options = {}) {
  const url = `${ESPER_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${ESPER_API_KEY}`,
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
 * Check if Esper API is configured
 */
export function isEsperConfigured() {
  return !!(ESPER_API_KEY && ESPER_ENTERPRISE_ID);
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
      imei: device.imei1 || device.networkInfo?.imei1 || null,
      imei2: device.imei2 || device.networkInfo?.imei2 || null,
      phoneNumber: device.networkInfo?.phoneNumber || null,
      simOperator: device.networkInfo?.simOperatorName || device.networkInfo?.simOperator || null,
      cellularNetworkType: device.networkInfo?.cellularNetworkType || null,
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
 * Get devices that haven't been seen in a specified number of months
 * Uses the same lastHeartbeatTime field that tracks device activity (like "over 24 hours" check)
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
  
  for (const device of devices) {
    // Get the last seen date - check all possible field locations from Esper API
    // Priority: lastHeartbeatTime (most reliable) > lastSeen
    const lastSeenStr = device.softwareInfo?.lastHeartbeatTime ||
                        device.status?.lastHeartbeatTime ||
                        device.lastHeartbeatTime ||
                        device.softwareInfo?.lastSeen || 
                        device.status?.lastSeen ||
                        device.last_seen ||
                        device.status_time ||
                        null;
    
    // Skip devices without a last seen date - we can't determine if they're stale
    if (!lastSeenStr) {
      continue;
    }
    
    const lastSeenDate = new Date(lastSeenStr);
    
    // Validate the date is valid
    if (isNaN(lastSeenDate.getTime())) {
      continue;
    }
    
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
};
