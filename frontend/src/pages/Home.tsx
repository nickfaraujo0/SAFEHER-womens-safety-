import React, { useEffect, useRef, useState } from "react";
import { MapPin, Route, Share2, Shield, AlertTriangle, Users, Bot, Zap, X, MessageCircle } from "lucide-react";
import { ChatBotButton } from "../components/common/ChatBotButton";
import { ChatBot } from "../components/common/ChatBot";
import { getUserContacts } from "../services/api";
import { sendSOSWhatsApp, createSOSMessage, formatPhoneForWhatsApp } from "../services/sos-whatsapp";
import { getNearbyLandmarks } from "../services/google-places";
import { getLatestCommunityReports, formatReportForUpdates, getCommunityStats } from "../services/community-reports";
import { getCurrentLocation } from "../utils/location";
import { getCurrentUser } from "../utils/auth";
import { getStaticLandmarks } from "../data/mockLocations";
interface SafetyFeaturesProps {
  onNavigate?: (tab: string) => void;
}

export function SafetyFeatures({ onNavigate }: SafetyFeaturesProps) {
  const [sosStatus, setSosStatus] = useState<"idle" | "holding" | "sending" | "sent" | "error">("idle");
  const [countdown, setCountdown] = useState(3);
  const holdTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, address: string, landmarks?: string} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [communityReports, setCommunityReports] = useState<any[]>([]);
  const [communityStats, setCommunityStats] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(false);



  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      
      // Extract detailed location information
      const locality = data.localityInfo?.administrative || [];
      const city = data.city || locality[1]?.name || '';
      const area = locality[2]?.name || locality[1]?.name || '';
      const neighborhood = locality[3]?.name || locality[2]?.name || '';
      const principalSubdivision = data.principalSubdivision || '';
      
      // Build specific location string
      let locationParts: string[] = [];
      
      // Add neighborhood/area first (most specific)
      if (neighborhood && neighborhood !== area) {
        locationParts.push(neighborhood);
      }
      
      // Add area
      if (area && area !== city) {
        locationParts.push(area);
      }
      
      // Add city
      if (city) {
        locationParts.push(city);
      }
      
      // Add state/region if available
      if (principalSubdivision && principalSubdivision !== city) {
        locationParts.push(principalSubdivision);
      }
      
      // If we have specific parts, join them
      if (locationParts.length > 0) {
        return locationParts.join(', ');
      }
      
      // Fallback to basic location
      return data.localityInfo?.administrative?.[0]?.name || 
             data.localityInfo?.administrative?.[1]?.name || 
             data.city || 
             'Unknown Location';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Unknown Location';
    }
  };

  // Use the new Google Places service (no CORS issues)
  const getNearbyLandmarksFromService = async (lat: number, lng: number) => {
    try {
      return await getNearbyLandmarks(lat, lng);
    } catch (error) {
      console.error('Error fetching landmarks from service:', error);
      // Fallback to static landmarks
      return getStaticLandmarks(lat, lng);
    }
  };



  const loadCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      const address = await reverseGeocode(location.lat, location.lng);
      const landmarks = await getNearbyLandmarksFromService(location.lat, location.lng);
      
      setCurrentLocation({
        lat: location.lat,
        lng: location.lng,
        address: address,
        landmarks: landmarks
      });
    } catch (error) {
      console.error('Error loading current location:', error);
      setCurrentLocation({
        lat: 0,
        lng: 0,
        address: 'Location not available'
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const getTrustedContacts = async (): Promise<string[]> => {
    const user = getCurrentUser();
    // Prefer DB contacts if user is logged in
    if (user?.id) {
      try {
        const numbers = await getUserContacts(user.id);
        if (numbers.length > 0) {
          console.log('Emergency contacts found in database:', numbers);
          return numbers;
        }
      } catch (error) {
        console.error('Error fetching emergency contacts from database:', error);
      }
    }
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem("trustedContacts");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v: any) => typeof v === "string") : [];
    } catch {
      return [];
    }
  };

  const composeAppleMapsUrl = (lat: number, lng: number) => {
    const label = encodeURIComponent("SOS - Need Help");
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
  };

  const sendSos = async () => {
    setSosStatus("sending");
    const contacts = await getTrustedContacts();
    console.log('Sending SOS to contacts:', contacts);
    const policeNumber = "112";

    const handleWithPosition = async (lat: number, lng: number) => {
      try {
        // Get current location details
        const address = currentLocation?.address || 'Location not available';
        const landmarks = currentLocation?.landmarks || '';

        // Create enhanced SOS message
        const sosMessage = createSOSMessage(lat, lng, address, landmarks);
        
        // Format contacts for WhatsApp
        const formattedContacts = contacts.map(contact => formatPhoneForWhatsApp(contact));
        
        console.log(`Sending WhatsApp messages via Twilio to ${formattedContacts.length} contacts`);

        // Send WhatsApp messages via Twilio (Supabase Edge Function)
        try {
          const result = await sendSOSWhatsApp({
            contacts: formattedContacts,
            message: sosMessage,
            userLocation: {
              lat,
              lng,
              address
            }
          });

          console.log('Twilio WhatsApp result:', result);
          
          if (result.success) {
            console.log(`Successfully sent ${result.totalSent} WhatsApp messages`);
            if (result.totalFailed > 0) {
              console.warn(`Failed to send ${result.totalFailed} messages`);
            }
          } else {
            console.error('Failed to send WhatsApp messages via Twilio');
          }
        } catch (twilioError) {
          console.error('Twilio WhatsApp error:', twilioError);
          
          // Fallback to browser-based WhatsApp
          console.log('Falling back to browser-based WhatsApp...');
          const encodedMessage = encodeURIComponent(sosMessage);
          
          contacts.forEach((contactNumber, index) => {
            try {
              const cleanNumber = contactNumber.replace(/[\s\-\(\)]/g, '');
              const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
              window.open(whatsappUrl, '_blank');
              setTimeout(() => {}, 500);
            } catch (error) {
              console.error('Error opening WhatsApp:', error);
            }
          });
        }

        // Also send SMS as backup
        const encodedMessage = encodeURIComponent(sosMessage);
        contacts.forEach((contactNumber) => {
          try {
            const smsUrl = `sms:${contactNumber}&body=${encodedMessage}`;
            window.open(smsUrl, '_blank');
          } catch (error) {
            console.error('Error opening SMS:', error);
          }
        });

        // Call police helpline
        try {
          window.open(`tel:${policeNumber}`);
        } catch (error) {
          console.error('Error calling police:', error);
        }

        setSosStatus("sent");
        // Reset back to idle after a short delay
        window.setTimeout(() => setSosStatus("idle"), 3000);
        
      } catch (error) {
        console.error('Error in SOS handling:', error);
        setSosStatus("error");
        window.setTimeout(() => setSosStatus("idle"), 3000);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => handleWithPosition(pos.coords.latitude, pos.coords.longitude),
        () => {
          setSosStatus("error");
          // Fallback without precise location
          handleWithPosition(0, 0);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setSosStatus("error");
      handleWithPosition(0, 0);
    }
  };

  const startHold = () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    
    setSosStatus("holding");
    setCountdown(3);
    
    // Start countdown
    let currentCount = 3;
    countdownTimerRef.current = window.setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);
      
      if (currentCount <= 0) {
        window.clearInterval(countdownTimerRef.current!);
        countdownTimerRef.current = null;
      }
    }, 1000);
    
    // Trigger SOS after 3 seconds
    holdTimerRef.current = window.setTimeout(() => {
      sendSos();
    }, 3000);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (sosStatus === "holding") {
      setSosStatus("idle");
      setCountdown(3);
    }
  };

  // Load community reports
  const loadCommunityReports = async () => {
    setLoadingReports(true);
    try {
      const reports = await getLatestCommunityReports(3); // Get latest 3 reports
      const formattedReports = reports.map(formatReportForUpdates);
      setCommunityReports(formattedReports);
      
      const stats = getCommunityStats();
      setCommunityStats(stats);
    } catch (error) {
      console.error('Error loading community reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  // Load current location and community reports on mount
  useEffect(() => {
    loadCurrentLocation();
    loadCommunityReports();
  }, []);

  // Preload contacts for dynamic count and SOS
  useEffect(() => {
    (async () => {
      const user = getCurrentUser();
      if (!user?.id) return;
      try {
        setLoadingContacts(true);
        const { data } = await supabase
          .from("contacts")
          .select("id, name, phone")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        setContacts((data as any) || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingContacts(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
      }
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Emergency SOS Button - moved to top */}
      <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
        <button
          className="w-full h-16 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-lg font-semibold rounded-xl transition-colors"
          aria-label="Emergency SOS"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
        >
          {sosStatus === "holding" && `Hold… ${countdown}s to send`}
          {sosStatus === "sending" && "Sending SOS…"}
          {sosStatus === "sent" && "SOS Sent"}
          {(sosStatus === "idle" || sosStatus === "error") && "🚨 Emergency SOS"}
        </button>
        <p className="text-center text-sm text-gray-500 mt-2">
          Long press for 3 seconds to send WhatsApp messages to emergency contacts and call police
        </p>
      </div>

      {/* Current Location Status */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-800">You are in a safe zone</h3>
            {locationLoading ? (
              <p className="text-sm text-green-600">Loading your location...</p>
            ) : currentLocation ? (
              <div>
                <p className="text-sm text-green-600 font-medium">{currentLocation.address}</p>
                {currentLocation.landmarks && (
                  <p className="text-xs text-green-500 mt-1">Near: {currentLocation.landmarks}</p>
                )}
                <p className="text-xs text-green-500">Safety Level: Safe</p>
              </div>
            ) : (
              <p className="text-sm text-green-600">Location not available</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadCurrentLocation}
              className="p-2 hover:bg-green-200 rounded-full transition-colors"
              title="Refresh location"
            >
              <MapPin className="h-4 w-4 text-green-600" />
            </button>
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Safe
          </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
          onClick={() => onNavigate?.("location")}
        >
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <MapPin className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold mb-1">Find Safe Places</h3>
          <p className="text-sm text-gray-500">Police stations, schools, hospitals</p>
        </button>

        <button
          className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
          onClick={() => onNavigate?.("location")}
        >
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Route className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="font-semibold mb-1">Plan Safe Route</h3>
          <p className="text-sm text-gray-500">Get safest path to destination</p>
        </button>
      </div>

      {/* Live Location Sharing */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Live Location Sharing</h3>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Share with trusted contacts</p>
              <p className="text-sm text-gray-500">
                {loadingContacts ? "Loading contacts…" : `${contacts.length} contact${contacts.length === 1 ? "" : "s"} saved`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="border border-gray-300 rounded-md px-3 py-1 text-sm hover:bg-gray-50"
                onClick={() => setIsAddOpen(true)}
              >
                Add
              </button>
              <button
                className="border border-gray-300 rounded-md px-3 py-1 text-sm hover:bg-gray-50"
                onClick={async () => {
                  setIsManageOpen(true);
                  setLoadingContacts(true);
                  try {
                    const user = getCurrentUser();
                    if (user?.id) {
                      const { data } = await supabase
                        .from("contacts")
                        .select("id, name, phone")
                        .eq("user_id", user.id)
                        .order("created_at", { ascending: false });
                      setContacts((data as any) || []);
                    } else {
                      setContacts([]);
                    }
                  } finally {
                    setLoadingContacts(false);
                  }
                }}
              >
              Manage
            </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <p className="text-sm text-gray-500">No contacts added yet. Tap Add to get started.</p>
            ) : (
              contacts.map((c) => {
                const initial = (c.name || c.phone || "?").trim().charAt(0).toUpperCase();
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">{initial}</span>
              </div>
              <div className="flex-1">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
                );
              })
            )}
          </div>
        </div>
      </div>
            

      {/* AI Safety Assistant */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="w-full bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all duration-200 hover:shadow-md"
      >
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">AI Safety Assistant</h3>
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
              New
            </span>
            <div className="ml-auto flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">Click to Chat</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 mb-4">
            Get instant safety advice, navigation help, and emergency guidance from our AI assistant.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white border border-purple-200 rounded-lg p-3 text-center">
              <Zap className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-purple-700">24/7 Available</p>
            </div>
            <div className="bg-white border border-purple-200 rounded-lg p-3 text-center">
              <Shield className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs font-medium text-purple-700">Safety Focused</p>
            </div>
          </div>
          <div className="bg-white border border-purple-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Bot className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-800">Recent Help:</p>
                <p className="text-xs text-purple-600">"What should I do if I feel unsafe walking at night?"</p>
              </div>
            </div>
          </div>
          
          {/* AI Assistant Features */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Safety Tips</span>
              <span className="text-green-600 font-medium">✓ Available</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Emergency Guidance</span>
              <span className="text-green-600 font-medium">✓ Ready</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Route Planning</span>
              <span className="text-green-600 font-medium">✓ Active</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Chat Support</span>
              <span className="text-purple-600 font-medium">→ Click to Start</span>
            </div>
          </div>
        </div>
      </button>

      {/* Community Updates */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Community Updates</h3>
            </div>
            <button 
              onClick={loadCommunityReports}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {loadingReports ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading latest updates...</p>
            </div>
          ) : communityReports.length === 0 ? (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No recent updates</p>
            </div>
          ) : (
            communityReports.map((report) => (
              <div key={report.id} className={`flex items-start gap-3 p-3 rounded-lg border ${report.bgColor} ${report.borderColor}`}>
                {report.icon === 'Shield' ? (
                  <Shield className={`h-4 w-4 ${report.iconColor} mt-0.5`} />
                ) : (
                  <AlertTriangle className={`h-4 w-4 ${report.iconColor} mt-0.5`} />
                )}
            <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-medium ${report.textColor}`}>{report.title}</p>
                    {report.verified && (
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                        Verified
                      </span>
                    )}
                    {report.is_anonymous && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        Anonymous
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${report.descColor} mb-1`}>{report.description}</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${report.timeColor}`}>
                      {report.time} • {report.location}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${report.timeColor}`}>
                        {report.upvotes} upvotes
                      </span>
                    </div>
                  </div>
            </div>
          </div>
            ))
          )}
          
          {/* Community Stats */}
          {communityStats && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-blue-600">{communityStats.activeUsers}</p>
                  <p className="text-xs text-gray-500">Active Users</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{communityStats.safeSpots}</p>
                  <p className="text-xs text-gray-500">Safe Spots</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-600">{communityStats.reportsToday}</p>
                  <p className="text-xs text-gray-500">Reports Today</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Bot Button */}
      <ChatBotButton />
      
      {/* ICPS Chat Interface */}
      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Add Contact Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md h-[60vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-2xl">
              <h3 className="font-semibold">Add Emergency Contact</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Phone number"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <button
                className="w-full bg-gray-900 text-white rounded-md py-2 text-sm disabled:opacity-50"
                disabled={!newName || !newPhone || savingContact}
                onClick={async () => {
                  setSavingContact(true);
                  setSaveError("");
                  const user = getCurrentUser();
                  if (!user?.id) {
                    setSaveError("Please log in first");
                    setSavingContact(false);
                    return;
                  }
                  try {
                    const { data, error } = await supabase
                      .from("contacts")
                      .insert({ user_id: user.id, name: newName, phone: newPhone })
                      .select("id, name, phone")
                      .single();
                    if (error) {
                      console.error("Supabase error:", error);
                      setSaveError(error.message || "Failed to save contact");
                      setSavingContact(false);
                      return;
                    }
                    setContacts([data as any, ...contacts]);
                    setNewName("");
                    setNewPhone("");
                    setIsAddOpen(false);
                    setSavingContact(false);
                  } catch (e) {
                    console.error("Save contact error:", e);
                    setSaveError("Unexpected error occurred");
                    setSavingContact(false);
                  }
                }}
              >
                {savingContact ? "Saving..." : "Save Contact"}
              </button>
              {saveError && (
                <p className="text-sm text-red-600 text-center">{saveError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Contacts Modal */}
      {isManageOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-2xl">
              <h3 className="font-semibold">Manage Emergency Contacts</h3>
              <button onClick={() => setIsManageOpen(false)} className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-2 max-h-64 overflow-auto">
                {loadingContacts ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-gray-500">No contacts yet.</p>
                ) : (
                  contacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.phone}</p>
                      </div>
                      <button
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={async () => {
                          try {
                            await supabase.from("contacts").delete().eq("id", c.id);
                            setContacts(contacts.filter((x) => x.id !== c.id));
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}