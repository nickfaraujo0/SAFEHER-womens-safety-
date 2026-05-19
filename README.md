# 🛡️ SafeHer - Women's Safety Application

SafeHer is a comprehensive, community-driven women's safety platform built to provide real-time assistance, reliable navigation, and emergency response features. It empowers users to navigate confidently by combining crowdsourced safety reports with advanced routing technology.

## ✨ Key Features

- **🚨 SOS Emergency Alerts (WhatsApp & SMS)**: Instantly dispatch distress signals containing your exact live location, coordinates, and Google Maps links to pre-configured emergency contacts via Twilio integration.
- **🗺️ Safe Route Navigation**: Calculates and suggests the safest walking routes based on crowdsourced safety scores and verified safe zones, rather than just the fastest path.
- **📍 Interactive Safety Map**: View real-time community reports on location safety. Add your own reports to mark areas as Safe, Moderate, Unsafe, or Dangerous to warn others.
- **🏥 Verified Safe Spots & Landmarks**: Automatically locates nearby hospitals, police stations, and safe establishments using the Google Places API.
- **⚠️ Danger Zone Alerts**: Highlights historically unsafe areas and provides active warnings to users approaching them.
- **👥 Community Dashboard**: View active reports, community activity, and real-time safety metrics in your area.

## 🛠️ Tech Stack & Technologies

### Frontend
- **Framework**: React (Bootstrapped with Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS for responsive, modern UI design
- **Components**: Radix UI / shadcn/ui & Lucide React for accessible icons
- **Mapping & Routing**: Google Maps API (Maps JavaScript API, Directions API, Geocoding API)

### Backend & Infrastructure
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Serverless Compute**: Supabase Edge Functions (Deno) for secure server-side logic
- **Emergency Messaging**: [Twilio API](https://www.twilio.com/) for reliable WhatsApp and SMS SOS delivery
- **Location Services**: Google Places API (Server-side to bypass CORS and secure API keys)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase Project
- A Twilio Account (for WhatsApp/SMS SOS features)
- A Google Cloud Project with Maps & Places APIs enabled

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nickfaraujo0/SAFEHER-womens-safety-.git
   cd SAFEHER-womens-safety-
   ```

2. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Environment Setup:**
   Copy the example environment file and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
   *Note: Ensure you add your Supabase URL, Anon Key, Twilio SID, and Google Maps API Key in `.env`.*

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

5. **Deploy Supabase Edge Functions (Backend):**
   ```bash
   # Navigate to the root directory
   supabase functions deploy send-sos-whatsapp
   supabase functions deploy google-places
   ```
   *(Ensure you have set the necessary secrets for Twilio and Google Places in your Supabase dashboard).*

## 🤝 Contribution

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.