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
    const { lat, lng, radius = 500, type = 'establishment' } = await req.json()

    if (!lat || !lng) {
      throw new Error('Latitude and longitude are required')
    }

    // Google Places API key — read from Supabase secret, fall back to hardcoded for dev
    const GOOGLE_PLACES_API_KEY =
      Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "YOUR_GOOGLE_PLACES_API_KEY"

    const apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`

    // Make request to Google Places API
    const response = await fetch(apiUrl)
    const rawBody = await response.text()

    if (!response.ok) {
      console.error(`Google Places HTTP error ${response.status}:`, rawBody)
      throw new Error(`Google Places API HTTP error: ${response.status} — ${rawBody}`)
    }

    let data: any
    try {
      data = JSON.parse(rawBody)
    } catch {
      throw new Error(`Google Places API returned non-JSON: ${rawBody}`)
    }

    console.log("Google Places status:", data.status, "| results:", data.results?.length ?? 0)

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      // Surface the error_message from Google if present
      const detail = data.error_message ? ` — ${data.error_message}` : ''
      throw new Error(`Google Places API status: ${data.status}${detail}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: data.results || [],
        status: data.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        results: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
