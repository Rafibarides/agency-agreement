/**
 * Esper Helper Utilities
 * 
 * Provides assistive functions to enhance forms with Esper data.
 * All functions are non-blocking - if Esper data isn't available,
 * the original data is returned unchanged.
 */

import { searchDeviceByTags, searchDeviceBySerial, searchDeviceByEsperCode, getDeviceApps, isEsperConfigured } from './esperApi';

/**
 * Map Esper tag abbreviations to full title format used in our forms
 * Format: "ABBREV – Full Title Name"
 */
const TITLE_ABBREVIATION_MAP = {
  'RN': 'RN – Registered Nurse',
  'LPN': 'LPN – Licensed Practical Nurse',
  'PT': 'PT – Physical Therapist',
  'PTA': 'PTA – Physical Therapist Assistant',
  'OT': 'OT – Occupational Therapist',
  'COTA': 'COTA – Certified Occupational Therapy Assistant',
  'ST': 'ST – Speech Therapist (Speech-Language Pathologist)',
  'SLP': 'ST – Speech Therapist (Speech-Language Pathologist)', // Alternative abbreviation
};

/**
 * Convert an Esper tag abbreviation to our full title format
 */
export function mapTitleAbbreviation(abbreviation) {
  if (!abbreviation) return null;
  const upper = abbreviation.toUpperCase().trim();
  return TITLE_ABBREVIATION_MAP[upper] || null;
}

/**
 * Extract Worker ID from Esper tags (looks for numeric tag)
 */
export function extractWorkerIdFromTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  
  // Worker ID is typically a numeric tag
  for (const tag of tags) {
    const trimmed = String(tag).trim();
    // Check if it's a pure number (Worker ID pattern)
    if (/^\d{4,6}$/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Extract title abbreviation from Esper tags
 */
export function extractTitleFromTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  
  for (const tag of tags) {
    const trimmed = String(tag).toUpperCase().trim();
    if (TITLE_ABBREVIATION_MAP[trimmed]) {
      return TITLE_ABBREVIATION_MAP[trimmed];
    }
  }
  return null;
}

/**
 * Extract name from Esper tags (non-numeric, non-title tag)
 */
export function extractNameFromTags(tags) {
  if (!tags || !Array.isArray(tags)) return null;
  
  for (const tag of tags) {
    const trimmed = String(tag).trim();
    // Skip if it's numeric (Worker ID)
    if (/^\d+$/.test(trimmed)) continue;
    // Skip if it's a known title abbreviation
    if (TITLE_ABBREVIATION_MAP[trimmed.toUpperCase()]) continue;
    // This is likely a name
    if (trimmed.length > 2) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Extract Esper identifier code from device name
 * Device name format: ESR-NNV-XXXXX
 */
export function extractEsperCodeFromDeviceName(deviceName) {
  if (!deviceName) return null;
  const match = deviceName.match(/ESR-NNV-([A-Z0-9]{5})$/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Search Esper for a person by name and return matching device info
 */
export async function searchEsperByName(name) {
  if (!name || !isEsperConfigured()) return null;
  
  try {
    // Search by name in tags
    const devices = await searchDeviceByTags(name);
    if (devices && devices.length > 0) {
      return devices[0];
    }
    
    // Try last name only (more specific)
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length > 1) {
      const lastName = nameParts[nameParts.length - 1];
      const devicesByLastName = await searchDeviceByTags(lastName);
      if (devicesByLastName && devicesByLastName.length === 1) {
        return devicesByLastName[0];
      }
    }
  } catch (error) {
    console.warn('Esper search by name failed:', error.message);
  }
  
  return null;
}

/**
 * Enhance form data with Esper information
 * 
 * This is the main function used to auto-fill form fields from Esper.
 * It's assistive - only fills in fields that are empty and have Esper data.
 * 
 * @param {Object} formData - Current form data
 * @param {Object} options - Search options
 * @param {boolean} options.searchByName - Whether to search by name
 * @param {boolean} options.searchBySerial - Whether to search by serial
 * @param {boolean} options.searchByEsperCode - Whether to search by Esper code
 * @returns {Object} Enhanced form data with Esper fields filled in
 */
export async function enhanceFormWithEsperData(formData, options = {}) {
  if (!isEsperConfigured()) {
    return { enhanced: false, data: formData, reason: 'Esper not configured' };
  }

  const {
    searchByName = true,
    searchBySerial = true,
    searchByEsperCode = true,
  } = options;

  let device = null;
  let searchMethod = null;

  try {
    // Strategy 1: Search by Esper code if available
    if (searchByEsperCode && formData.esperIdentifier) {
      device = await searchDeviceByEsperCode(formData.esperIdentifier);
      if (device) searchMethod = 'esper_code';
    }

    // Strategy 2: Search by serial number
    if (!device && searchBySerial && formData.serialNumber) {
      device = await searchDeviceBySerial(formData.serialNumber);
      if (device) searchMethod = 'serial';
    }

    // Strategy 3: Search by name
    if (!device && searchByName && formData.name) {
      device = await searchEsperByName(formData.name);
      if (device) searchMethod = 'name';
    }

    if (!device) {
      return { enhanced: false, data: formData, reason: 'No matching device found' };
    }

    // Extract data from device
    const tags = device.tags || [];
    const enhancedData = { ...formData };
    const fieldsEnhanced = [];

    // Fill Worker ID if empty
    if (!enhancedData.workerId) {
      const workerId = extractWorkerIdFromTags(tags);
      if (workerId) {
        enhancedData.workerId = workerId;
        fieldsEnhanced.push('workerId');
      }
    }

    // Fill title if empty
    if (!enhancedData.title) {
      const title = extractTitleFromTags(tags);
      if (title) {
        enhancedData.title = title;
        fieldsEnhanced.push('title');
      }
    }

    // Fill Esper identifier if empty
    if (!enhancedData.esperIdentifier && device.device_name) {
      const esperCode = extractEsperCodeFromDeviceName(device.device_name);
      if (esperCode) {
        enhancedData.esperIdentifier = esperCode;
        fieldsEnhanced.push('esperIdentifier');
      }
    }

    // Fill serial number if empty (from device hardware info)
    if (!enhancedData.serialNumber) {
      const serial = device.hardwareInfo?.serialNumber || 
                     device.suid ||
                     (device.alias_name?.match(/^([A-Z0-9]+)\s*-/)?.[1]);
      if (serial) {
        enhancedData.serialNumber = serial;
        fieldsEnhanced.push('serialNumber');
      }
    }

    // Fill device name if device checkbox is checked but name is empty
    if (enhancedData.device && !enhancedData.deviceName) {
      const model = device.hardwareInfo?.model || device.hardwareInfo?.brand;
      if (model) {
        enhancedData.deviceName = model;
        fieldsEnhanced.push('deviceName');
      }
    }

    return {
      enhanced: fieldsEnhanced.length > 0,
      data: enhancedData,
      fieldsEnhanced,
      searchMethod,
      deviceInfo: {
        id: device.id,
        name: device.device_name,
        alias: device.alias_name,
        state: device.state,
        tags: device.tags
      }
    };

  } catch (error) {
    console.warn('Failed to enhance form with Esper data:', error.message);
    return { enhanced: false, data: formData, reason: error.message };
  }
}

/**
 * Quick lookup to get Worker ID from Esper by name
 * Used by HR page when creating device requests
 */
export async function lookupWorkerIdByName(name) {
  if (!name || !isEsperConfigured()) return null;
  
  try {
    const device = await searchEsperByName(name);
    if (device && device.tags) {
      return extractWorkerIdFromTags(device.tags);
    }
  } catch (error) {
    console.warn('Failed to lookup Worker ID:', error.message);
  }
  
  return null;
}

/**
 * Get device alias name (usually contains employee name and serial)
 * Format: "R92X90ESZTD - Mark Beyer"
 */
export function parseDeviceAlias(alias) {
  if (!alias) return null;
  
  const match = alias.match(/^([A-Z0-9]+)\s*-\s*(.+)$/i);
  if (match) {
    return {
      serial: match[1].trim(),
      name: match[2].trim()
    };
  }
  return null;
}

export default {
  mapTitleAbbreviation,
  extractWorkerIdFromTags,
  extractTitleFromTags,
  extractNameFromTags,
  extractEsperCodeFromDeviceName,
  searchEsperByName,
  enhanceFormWithEsperData,
  lookupWorkerIdByName,
  parseDeviceAlias,
  TITLE_ABBREVIATION_MAP,
};
