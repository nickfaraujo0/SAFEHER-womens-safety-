import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { contacts, message, userLocation } = await req.json()

    // Twilio configuration
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || 'YOUR_TWILIO_ACCOUNT_SID'
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') // Set this in Supabase dashboard
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER') // Set this in Supabase dashboard

    if (!authToken || !fromNumber) {
      throw new Error('Twilio configuration missing')
    }

    const results = []

    // Send WhatsApp messages to all contacts
    for (const contact of contacts) {
      try {
        // Format phone number
        const cleanedNumber = contact.replace(/\D/g, '')
        const formattedNumber = cleanedNumber.length === 10 ? '91' + cleanedNumber : cleanedNumber

        // Twilio WhatsApp API call
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: `whatsapp:${fromNumber}`,
              To: `whatsapp:+${formattedNumber}`,
              Body: message,
            }).toString(),
          }
        )

        if (response.ok) {
          const result = await response.json()
          results.push({
            contact,
            status: 'success',
            messageId: result.sid,
          })
        } else {
          const error = await response.text()
          results.push({
            contact,
            status: 'error',
            error: error,
          })
        }

        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        results.push({
          contact,
          status: 'error',
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalSent: results.filter(r => r.status === 'success').length,
        totalFailed: results.filter(r => r.status === 'error').length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
