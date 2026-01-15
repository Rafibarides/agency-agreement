// Google Apps Script Web App API Configuration
const API_URL = 'https://script.google.com/macros/s/AKfycbzcOYK_OaZLTxI0JGiOa45hARPFHeVmGFsBUDi1x5sTZn2hSSzZvBaR2NGONFgxHYpu/exec';

// Helper function to make API requests
async function apiRequest(action, data = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action,
        ...data
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message || 'Network error occurred'
    };
  }
}

// Submit a new agreement form
export async function submitAgreement(formData) {
  return apiRequest('submitForm', formData);
}

// Admin login
export async function adminLogin(username, password) {
  return apiRequest('login', { username, password });
}

// Get all agreements (admin)
export async function getAllAgreements() {
  return apiRequest('getAgreements');
}

// Search agreements
export async function searchAgreements(query) {
  return apiRequest('searchAgreements', { query });
}

// Get statistics
export async function getStatistics() {
  return apiRequest('getStats');
}

// Verify PIN for APF access
export async function verifyPin(pin) {
  return apiRequest('verifyPin', { pin });
}

// Hold form for signature (submit without signatures)
export async function holdForSignature(formData) {
  return apiRequest('holdForSignature', formData);
}

// Get all unsigned agreements (for APF list)
export async function getUnsignedAgreements() {
  return apiRequest('getUnsignedAgreements');
}

// Update existing agreement with signatures
export async function updateWithSignatures(formData) {
  return apiRequest('updateWithSignatures', formData);
}

// Get a specific agreement by row number (for barcode scanning)
export async function getAgreementByRowNumber(rowNumber) {
  return apiRequest('getAgreementByRow', { rowNumber });
}

// Mark device as provisioned (ready for pickup)
export async function markDeviceProvisioned(rowNumber, provisioned = true) {
  return apiRequest('markDeviceProvisioned', { rowNumber, provisioned });
}

// Get all provisioned devices ready for pickup
export async function getProvisionedDevices() {
  return apiRequest('getProvisionedDevices');
}

// Mark device as due for return
export async function markDueForReturn(rowNumber, dueForReturn = true) {
  return apiRequest('markDueForReturn', { rowNumber, dueForReturn });
}

// Get all devices marked as due for return
export async function getDueForReturnDevices() {
  return apiRequest('getDueForReturnDevices');
}

// ============================================
// RETRIEVAL PROGRAM API
// ============================================

// Retrieval stages configuration
export const RETRIEVAL_STAGES = {
  1: { name: 'Terminated/Inactive', color: '#EF5350' },
  2: { name: 'Text Sent to Staff', color: '#FF9800' },
  3: { name: 'Staff Called', color: '#FFC107' },
  4: { name: 'Final Follow Up', color: '#9C27B0' },
  5: { name: 'Scheduled Dropoff', color: '#2196F3' },
  6: { name: 'Awaiting Mailback', color: '#00BCD4' },
  7: { name: 'Device Returned', color: '#4CAF50' },
  8: { name: 'Remotely Offboarded', color: '#607D8B' }
};

// Create a new retrieval case (copies device info from Esper)
export async function createRetrievalCase(data) {
  return apiRequest('createRetrievalCase', data);
}

// Get all retrieval cases
export async function getRetrievalCases() {
  return apiRequest('getRetrievalCases');
}

// Update retrieval case stage
export async function updateRetrievalStage(caseId, newStage, notes = '') {
  return apiRequest('updateRetrievalStage', { caseId, newStage, notes });
}

// Update call status for Stage 3
export async function updateRetrievalCallStatus(caseId, callStatus) {
  return apiRequest('updateRetrievalCallStatus', { caseId, callStatus });
}

// Delete (soft) a retrieval case
export async function deleteRetrievalCase(caseId) {
  return apiRequest('deleteRetrievalCase', { caseId });
}

// Add a note to a retrieval case
export async function addRetrievalNote(caseId, note) {
  return apiRequest('addRetrievalNote', { caseId, note });
}

// Company information
export const COMPANY_INFO = {
  name: 'AMBER COURT AT HOME D/B/A WELLBOUND',
  address: '7424 13th Avenue',
  city: 'Brooklyn, NY 11228',
  phone: 'Tel: 718-530-9880'
};

// Title options for dropdown
export const TITLE_OPTIONS = [
  { value: '', label: 'Select Title...' },
  { value: 'RN – Registered Nurse', label: 'RN – Registered Nurse' },
  { value: 'LPN – Licensed Practical Nurse', label: 'LPN – Licensed Practical Nurse' },
  { value: 'PT – Physical Therapist', label: 'PT – Physical Therapist' },
  { value: 'PTA – Physical Therapist Assistant', label: 'PTA – Physical Therapist Assistant' },
  { value: 'OT – Occupational Therapist', label: 'OT – Occupational Therapist' },
  { value: 'COTA – Certified Occupational Therapy Assistant', label: 'COTA – Certified Occupational Therapy Assistant' },
  { value: 'ST – Speech Therapist (Speech-Language Pathologist)', label: 'ST – Speech Therapist (Speech-Language Pathologist)' },
  { value: 'OTHER', label: 'OTHER' }
];

// Property items
export const PROPERTY_ITEMS = [
  { id: 'device', label: 'Device', hasInput: true, placeholder: 'Lenovo Tab' },
  { id: 'portableCharger', label: 'Portable Charger', hasInput: false },
  { id: 'protectiveCover', label: 'Protective Cover', hasInput: false },
  { id: 'keyboard', label: 'Keyboard/Accessory', hasInput: false }
];

// Agreement texts
export const AGREEMENTS = [
  {
    id: 'agreement1',
    text: 'I agree to maintain all Agency property in working condition, and to notify the Agency in the event that the property malfunctions in any way, or if the property is lost or stolen.'
  },
  {
    id: 'agreement2',
    text: 'If there are any items which I do not need, these will be returned immediately to my Supervisor.'
  },
  {
    id: 'agreement3',
    text: 'I have been advised by my Supervisor / Human Resources, that it is my responsibility to return all property to the Agency upon termination of the engagement between myself and the Agency.'
  }
];

export default {
  submitAgreement,
  adminLogin,
  getAllAgreements,
  searchAgreements,
  getStatistics,
  verifyPin,
  holdForSignature,
  getUnsignedAgreements,
  updateWithSignatures,
  getAgreementByRowNumber,
  markDeviceProvisioned,
  getProvisionedDevices,
  markDueForReturn,
  getDueForReturnDevices,
  // Retrieval Program
  RETRIEVAL_STAGES,
  createRetrievalCase,
  getRetrievalCases,
  updateRetrievalStage,
  updateRetrievalCallStatus,
  deleteRetrievalCase,
  addRetrievalNote,
  // Constants
  COMPANY_INFO,
  TITLE_OPTIONS,
  PROPERTY_ITEMS,
  AGREEMENTS
};

