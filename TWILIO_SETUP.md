# Twilio WhatsApp Integration Setup

This guide will help you set up automatic WhatsApp SOS messages using your Twilio account.

## Prerequisites

1. **Twilio Account**: You already have account SID: `YOUR_TWILIO_ACCOUNT_SID`
2. **Supabase Project**: Your existing Supabase project
3. **WhatsApp Business Account**: Connected to your Twilio account

## Setup Steps

### 1. Get Your Twilio Credentials

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. Go to **Account** → **API Keys & Tokens**
3. Copy your **Auth Token**
4. Go to **Phone Numbers** → **Manage** → **Active Numbers**
5. Find your WhatsApp-enabled number and copy it

### 2. Configure Supabase Environment Variables

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Add these environment variables:
   ```
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_WHATSAPP_NUMBER=your_whatsapp_number_here
   ```

### 3. Deploy the Edge Function

1. Install Supabase CLI:

   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:

   ```bash
   supabase login
   ```

3. Link your project:

   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the edge function:
   ```bash
   supabase functions deploy send-sos-whatsapp
   ```

### 4. Test the Integration

1. Open your SafeHer app
2. Add emergency contacts in the "Manage Contacts" section
3. Press and hold the SOS button for 3 seconds
4. Check that WhatsApp messages are sent to your emergency contacts

## How It Works

### Automatic WhatsApp Messages

When the SOS button is pressed:

1. **Location Detection**: Gets current GPS coordinates
2. **Message Creation**: Creates detailed SOS message with location links
3. **Twilio Integration**: Sends WhatsApp messages via Twilio API
4. **Fallback**: If Twilio fails, falls back to browser-based WhatsApp
5. **Backup**: Also sends SMS and calls police helpline

### Message Format

The SOS message includes:

- 🚨 Emergency alert
- 📍 Exact coordinates (lat/lng)
- 🗺️ Google Maps and Apple Maps links
- ⏰ Timestamp
- 📍 Address (if available)
- 🏢 Nearby landmarks (if available)

### Security Features

- **Server-side Processing**: Twilio API calls are made from Supabase Edge Functions
- **Environment Variables**: Sensitive credentials are stored securely
- **Rate Limiting**: Built-in delays to prevent API rate limits
- **Error Handling**: Graceful fallbacks if services fail

## Troubleshooting

### Common Issues

1. **Messages Not Sending**

   - Check Twilio credentials in Supabase environment variables
   - Verify WhatsApp number is properly configured in Twilio
   - Check Supabase Edge Function logs

2. **Phone Number Format Issues**

   - Ensure phone numbers include country code
   - Remove spaces, dashes, and parentheses
   - Use format: +91XXXXXXXXXX (for India)

3. **Rate Limiting**
   - Twilio has rate limits for WhatsApp messages
   - The system includes 1-second delays between messages
   - For high volume, consider upgrading Twilio plan

### Debug Mode

Enable debug logging by checking browser console for:

- `Sending WhatsApp messages via Twilio to X contacts`
- `Twilio WhatsApp result: {...}`
- `Successfully sent X WhatsApp messages`

## Cost Considerations

- **Twilio WhatsApp**: ~$0.005 per message
- **Supabase Edge Functions**: Free tier includes 500,000 requests/month
- **SMS Backup**: Additional cost if SMS is used

## Security Notes

- Never expose Twilio Auth Token in client-side code
- Use Supabase Edge Functions for server-side API calls
- Store sensitive credentials in environment variables
- Implement proper error handling and logging

## Support

If you encounter issues:

1. Check Twilio Console for message delivery status
2. Review Supabase Edge Function logs
3. Verify phone number formats
4. Test with a single contact first

## Future Enhancements

Potential improvements:

- Message delivery confirmations
- Custom message templates
- Multi-language support
- Voice messages via Twilio
- Integration with emergency services APIs
