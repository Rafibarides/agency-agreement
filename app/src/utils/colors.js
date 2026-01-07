// Color Theme Configuration
// All colors used throughout the application should be imported from this file
// Do not hardcode colors anywhere else in the codebase

const colors = {
  // Primary colors
  mainBackground: '#3E0E30',
  darkPurple: '#3E0E30',
  accentPink: '#E677B3',
  softPink: '#f6deee',
  mutedPurple: '#524659',
  white: '#FFFFFF',
  salmonPink: '#f6deee',
  
  // Glass morphism specific
  glassBackground: 'rgba(82, 70, 89, 0.25)',
  glassBorder: 'rgba(230, 119, 179, 0.3)',
  glassHighlight: 'rgba(246, 222, 238, 0.15)',
  glassShadow: 'rgba(62, 14, 48, 0.5)',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#f6deee',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  textDark: '#3E0E30',
  
  // Input colors
  inputBackground: 'rgba(82, 70, 89, 0.4)',
  inputBorder: 'rgba(230, 119, 179, 0.4)',
  inputFocus: '#E677B3',
  inputPlaceholder: 'rgba(246, 222, 238, 0.6)',
  
  // Button colors
  buttonPrimary: '#E677B3',
  buttonPrimaryHover: '#f6deee',
  buttonSecondary: 'rgba(82, 70, 89, 0.6)',
  buttonSecondaryHover: 'rgba(82, 70, 89, 0.8)',
  buttonText: '#3E0E30',
  
  // Status colors
  success: '#4CAF50',
  error: '#E57373',
  errorRed: '#E57373',
  warning: '#FFB74D',
  info: '#E677B3',
  
  // Simplified aliases
  glassBg: 'rgba(82, 70, 89, 0.25)',
  
  // Gradient overlays
  gradientOverlay: 'linear-gradient(135deg, rgba(62, 14, 48, 0.9) 0%, rgba(82, 70, 89, 0.7) 100%)',
  gradientAccent: 'linear-gradient(135deg, #E677B3 0%, #f6deee 100%)',
  gradientGlass: 'linear-gradient(135deg, rgba(230, 119, 179, 0.1) 0%, rgba(246, 222, 238, 0.05) 100%)',
  
  // Signature pad
  signatureStroke: '#E677B3',
  signatureBackground: 'rgba(255, 255, 255, 0.95)',
  
  // PDF/Print specific
  printBackground: '#FFFFFF',
  printText: '#3E0E30',
  printBorder: '#E677B3',
};

export default colors;
