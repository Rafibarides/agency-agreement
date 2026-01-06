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
  COMPANY_INFO,
  TITLE_OPTIONS,
  PROPERTY_ITEMS,
  AGREEMENTS
};

