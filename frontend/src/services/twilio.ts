// Twilio WhatsApp Service
// Note: This is a client-side implementation for demonstration
// In production, you should use Twilio's server-side API for security

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // Your Twilio WhatsApp number
}

export interface WhatsAppMessage {
  to: string;
  body: string;
}

class TwilioWhatsAppService {
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;
  }

  // Send WhatsApp message via Twilio API
  async sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
    try {
      // Format phone number for WhatsApp (remove + and add country code if needed)
      const formattedNumber = this.formatPhoneNumber(message.to);
      
      // Twilio WhatsApp API endpoint
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
      
      // Create form data for Twilio API
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${this.config.fromNumber}`);
      formData.append('To', `whatsapp:${formattedNumber}`);
      formData.append('Body', message.body);

      // Make request to Twilio API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('WhatsApp message sent successfully:', result);
        return true;
      } else {
        const error = await response.text();
        console.error('Failed to send WhatsApp message:', error);
        return false;
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  // Send multiple WhatsApp messages
  async sendBulkWhatsAppMessages(messages: WhatsAppMessage[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Send messages with small delays to avoid rate limiting
    for (const message of messages) {
      const result = await this.sendWhatsAppMessage(message);
      if (result) {
        success++;
      } else {
        failed++;
      }
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success, failed };
  }

  // Format phone number for WhatsApp
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // Validate phone number format
  isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
}

// Create Twilio service instance
export const twilioService = new TwilioWhatsAppService({
  accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
  authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN', // You'll need to provide this
  fromNumber: import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER || 'YOUR_TWILIO_WHATSAPP_NUMBER', // Your Twilio WhatsApp number
});

// Alternative: Use Twilio's client-side SDK (if available)
export const sendWhatsAppViaTwilio = async (
  to: string, 
  message: string, 
  accountSid: string, 
  authToken: string, 
  fromNumber: string
): Promise<boolean> => {
  try {
    const formattedNumber = to.replace(/\D/g, '');
    const finalNumber = formattedNumber.length === 10 ? '91' + formattedNumber : formattedNumber;
    
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${fromNumber}`);
    formData.append('To', `whatsapp:+${finalNumber}`);
    formData.append('Body', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    return response.ok;
  } catch (error) {
    console.error('Twilio WhatsApp error:', error);
    return false;
  }
};
