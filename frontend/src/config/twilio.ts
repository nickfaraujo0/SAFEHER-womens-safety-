// Twilio Configuration
// Note: In production, these should be environment variables

export const TWILIO_CONFIG = {
  // Your Twilio Account SID (read from env variables)
  ACCOUNT_SID: import.meta.env.VITE_TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
  
  // Your Twilio Auth Token (set this in Supabase environment variables)
  // AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  
  // Your Twilio WhatsApp Number (set this in Supabase environment variables)
  // WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
  
  // Default country code for phone numbers
  DEFAULT_COUNTRY_CODE: '91', // India
  
  // WhatsApp message templates (optional)
  MESSAGE_TEMPLATES: {
    SOS: '🚨 EMERGENCY SOS 🚨\n\nI need immediate help!\n\n📍 My exact location:\n• Latitude: {lat}\n• Longitude: {lng}\n• Address: {address}\n\n🗺️ Location Links:\n• Google Maps: {googleMaps}\n• Apple Maps: {appleMaps}\n\n⏰ Time: {timestamp}\n\nPlease help me immediately!',
    
    SAFETY_CHECK: '✅ Safety Check\n\nI\'m safe and at: {address}\n\nTime: {timestamp}',
    
    LOCATION_SHARE: '📍 Location Share\n\nI\'m currently at: {address}\n\nCoordinates: {lat}, {lng}\n\nTime: {timestamp}'
  }
};

// Phone number formatting utilities
export const formatPhoneNumber = (phoneNumber: string, countryCode: string = TWILIO_CONFIG.DEFAULT_COUNTRY_CODE): string => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present
  if (cleaned.length === 10) {
    cleaned = countryCode + cleaned;
  }
  
  return '+' + cleaned;
};

// Validate phone number
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

// Get WhatsApp URL for a phone number
export const getWhatsAppUrl = (phoneNumber: string, message?: string): string => {
  const formattedNumber = formatPhoneNumber(phoneNumber);
  const baseUrl = `https://wa.me/${formattedNumber.replace('+', '')}`;
  
  if (message) {
    const encodedMessage = encodeURIComponent(message);
    return `${baseUrl}?text=${encodedMessage}`;
  }
  
  return baseUrl;
};
