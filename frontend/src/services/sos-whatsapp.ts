import { supabase } from '../utils/supabase/client';

export interface SOSMessage {
  contacts: string[];
  message: string;
  userLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export interface SOSResult {
  success: boolean;
  results: Array<{
    contact: string;
    status: 'success' | 'error';
    messageId?: string;
    error?: string;
  }>;
  totalSent: number;
  totalFailed: number;
}

// Send SOS messages via WhatsApp using Supabase Edge Function
export const sendSOSWhatsApp = async (sosData: SOSMessage): Promise<SOSResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-sos-whatsapp', {
      body: sosData,
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error sending SOS WhatsApp messages:', error);
    throw error;
  }
};

// Create SOS message content
export const createSOSMessage = (
  lat: number,
  lng: number,
  address?: string,
  landmarks?: string
): string => {
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const appleMapsUrl = `https://maps.apple.com/?ll=${lat},${lng}&q=SOS%20-%20Need%20Help`;
  
  let message = `🚨 EMERGENCY SOS 🚨

I need immediate help!

📍 My exact location:
• Latitude: ${lat.toFixed(6)}
• Longitude: ${lng.toFixed(6)}`;

  if (address) {
    message += `\n• Address: ${address}`;
  }

  if (landmarks) {
    message += `\n• Nearby landmarks: ${landmarks}`;
  }

  message += `

🗺️ Location Links:
• Google Maps: ${mapsUrl}
• Apple Maps: ${appleMapsUrl}

⏰ Time: ${new Date().toLocaleString()}

Please help me immediately!`;

  return message;
};

// Format phone numbers for WhatsApp
export const formatPhoneForWhatsApp = (phoneNumber: string): string => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return '+' + cleaned;
};

// Validate phone number
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};
