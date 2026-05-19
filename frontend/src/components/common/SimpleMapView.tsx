import React, { useEffect, useRef, useState } from "react";
import { MapPin, Shield, AlertTriangle, X, Plus } from "lucide-react";
import { getUserSafetyReports, addSafetyReport } from "../../services/api";
import { getCurrentUser } from "../../utils/auth";
import { getCurrentLocation as getUserLocation } from "../../utils/location";
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

// Module-level promise so the script is only ever injected once across remounts
let mapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (mapsScriptPromise) return mapsScriptPromise;

  // Already available (e.g. hot-reload)
  if (window.google && window.google.maps) {
    mapsScriptPromise = Promise.resolve();
    return mapsScriptPromise;
  }

  mapsScriptPromise = new Promise((resolve, reject) => {
    // Avoid duplicate script tags
    const existing = document.querySelector('script[data-gmaps]');
    if (existing) {
      // Script tag exists but google not ready yet – wait for load
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
      return;
    }

    const callbackName = '__gmapsReady__';
    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.setAttribute('data-gmaps', 'true');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      mapsScriptPromise = null; // allow retry
      reject(new Error('Failed to load Google Maps script'));
    };

    // Detect billing / key auth failures
    (window as any).gm_authFailure = () => {
      mapsScriptPromise = null;
      reject(new Error('Google Maps API key is invalid or not authorised for this domain'));
    };

    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

interface SafetyMarker {
  id: string;
  lat: number;
  lng: number;
  safetyLevel: 'safe' | 'moderate' | 'unsafe' | 'dangerous';
  timestamp: number;
  description?: string;
}

const safetyLevels = [
  { key: 'safe', label: 'Safe', color: '#10B981', icon: '🟢' },
  { key: 'moderate', label: 'Moderate', color: '#F59E0B', icon: '🟡' },
  { key: 'unsafe', label: 'Unsafe', color: '#F97316', icon: '🟠' },
  { key: 'dangerous', label: 'Dangerous', color: '#EF4444', icon: '🔴' }
];

export function SimpleMapView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const initializedRef = useRef(false);
  const [selectedSafetyLevel, setSelectedSafetyLevel] = useState<'safe' | 'moderate' | 'unsafe' | 'dangerous'>('safe');
  const [markers, setMarkers] = useState<SafetyMarker[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string>("");
  const [showSafetyPopup, setShowSafetyPopup] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{lat: number, lng: number} | null>(null);
  const [description, setDescription] = useState("");
  const [savingMarker, setSavingMarker] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<any>(null);



  // Load user-specific markers from database
  useEffect(() => {
    const loadUserMarkers = async () => {
      const user = getCurrentUser();
      if (!user?.id) {
        // Fallback to localStorage if not logged in
        const savedMarkers = localStorage.getItem('safetyMarkers');
        if (savedMarkers) {
          try {
            const parsedMarkers = JSON.parse(savedMarkers);
            setMarkers(parsedMarkers);
          } catch (error) {
            console.error('Error loading saved markers:', error);
          }
        }
        return;
      }

      try {
        const data = await getUserSafetyReports(user.id);

        const userMarkers: SafetyMarker[] = (data || []).map(report => ({
          id: report.id,
          lat: parseFloat(report.latitude),
          lng: parseFloat(report.longitude),
          safetyLevel: report.safety_level,
          timestamp: new Date(report.created_at).getTime(),
          description: report.description
        }));

        setMarkers(userMarkers);
      } catch (error) {
        console.error("Error loading user markers:", error);
        // Fallback to localStorage
        const savedMarkers = localStorage.getItem('safetyMarkers');
        if (savedMarkers) {
          try {
            const parsedMarkers = JSON.parse(savedMarkers);
            setMarkers(parsedMarkers);
          } catch (e) {
            console.error('Error loading saved markers:', e);
          }
        }
      }
    };

    loadUserMarkers();
  }, []);

  // Save markers to localStorage
  useEffect(() => {
    if (markers.length > 0) {
      localStorage.setItem('safetyMarkers', JSON.stringify(markers));
    }
  }, [markers]);

  // Initialize map – uses the module-level promise so script loads exactly once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
      } catch (err: any) {
        if (!cancelled) {
          setMapError(err.message || 'Failed to load Google Maps');
          setMapLoading(false);
        }
        return;
      }

      if (cancelled || !mapContainerRef.current) return;

      try {
        // Try to get user's current location
        let center = { lat: 15.3268, lng: 73.9335 }; // Default to Goa
        let zoom = 13;
        let currentUserLocation = null;

        try {
          const location = await getUserLocation();
          if (!cancelled) {
            center = location;
            zoom = 15;
            currentUserLocation = location;
            setUserLocation(location);
          }
        } catch {
          console.log('Location not available, defaulting to Goa');
        }

        if (cancelled || !mapContainerRef.current) return;

        mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center,
          zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          gestureHandling: 'greedy',
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        // Blue dot for current location
        if (currentUserLocation) {
          const userMarker = new window.google.maps.Marker({
            position: currentUserLocation,
            map: mapInstanceRef.current,
            title: 'You are here',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            },
            zIndex: 1000,
          });
          setUserLocationMarker(userMarker);
        }

        // Click to add safety reports
        mapInstanceRef.current.addListener('click', (event: any) => {
          if (cancelled) return;
          setPendingLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() });
          setShowSafetyPopup(true);
          setDescription('');
        });

        // Render persisted markers
        markers.forEach(marker => addMarkerToMap(marker));

        initializedRef.current = true;
        if (!cancelled) setMapLoading(false);
      } catch (error: any) {
        console.error('Map initialization error:', error);
        if (!cancelled) {
          setMapError(error.message || 'Failed to initialize map');
          setMapLoading(false);
        }
      }
    };

    initMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach(m => {
        if (m.marker) m.marker.setMap(null);
        if (m.infoWindow) m.infoWindow.close();
      });
      markersRef.current = [];
      initializedRef.current = false;
    };
  }, []);

  const addMarker = async (lat: number, lng: number, safetyLevel: 'safe' | 'moderate' | 'unsafe' | 'dangerous', description?: string) => {
    const user = getCurrentUser();
    const timestamp = Date.now();
    
    if (user?.id) {
      // Save to database
      try {
        const data = await addSafetyReport(user.id, lat, lng, safetyLevel, description);

        const newMarker: SafetyMarker = {
          id: data.id,
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          safetyLevel: data.safety_level,
          timestamp: new Date(data.created_at).getTime(),
          description: data.description
        };

        setMarkers(prev => [newMarker, ...prev]);
        addMarkerToMap(newMarker);
      } catch (error) {
        console.error("Error saving marker to database:", error);
        // Fallback to localStorage
        const newMarker: SafetyMarker = {
          id: Date.now().toString(),
          lat,
          lng,
          safetyLevel,
          timestamp,
          description
        };
        setMarkers(prev => [...prev, newMarker]);
        addMarkerToMap(newMarker);
      }
    } else {
      // Not logged in, save to localStorage only
      const newMarker: SafetyMarker = {
        id: Date.now().toString(),
        lat,
        lng,
        safetyLevel,
        timestamp,
        description
      };
      setMarkers(prev => [...prev, newMarker]);
      addMarkerToMap(newMarker);
    }
  };

  const addMarkerToMap = (markerData: SafetyMarker) => {
    if (!mapInstanceRef.current || !window.google) return;

    const google = window.google;
    const safetyConfig = safetyLevels.find(s => s.key === markerData.safetyLevel);

    const marker = new google.maps.Marker({
      position: { lat: markerData.lat, lng: markerData.lng },
      map: mapInstanceRef.current,
      title: `${safetyConfig?.label} Location`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 18, // Made bigger
        fillColor: safetyConfig?.color || '#10B981',
        fillOpacity: 0.9,
        strokeColor: '#FFFFFF',
        strokeWeight: 3 // Thicker border
      }
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${safetyConfig?.icon} ${safetyConfig?.label} Location
          </div>
          <div style="font-size: 12px; color: #666;">
            Added: ${new Date(markerData.timestamp).toLocaleString()}
          </div>
          <button onclick="removeMarker('${markerData.id}')" style="margin-top: 8px; padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Remove
          </button>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(mapInstanceRef.current, marker);
    });

    markersRef.current.push({ marker, markerData, infoWindow });
  };

  const removeMarker = (markerId: string) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId));

    const markerIndex = markersRef.current.findIndex(m => m.markerData.id === markerId);
    if (markerIndex !== -1) {
      const markerRef = markersRef.current[markerIndex];
      if (markerRef.marker) markerRef.marker.setMap(null);
      if (markerRef.infoWindow) markerRef.infoWindow.close();
      markersRef.current.splice(markerIndex, 1);
    }
  };

  // Expose removeMarker globally
  useEffect(() => {
    (window as any).removeMarker = removeMarker;
    return () => {
      delete (window as any).removeMarker;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
      {/* Loading Overlay */}
      {mapLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {mapError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center p-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-2">Map failed to load</p>
            <p className="text-xs text-gray-500 mb-3">{mapError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Safety Reports</h3>
          </div>
          <p className="text-xs text-gray-500">
            Click anywhere on the map to add a safety report
          </p>
        </div>
      </div>

      {/* My Location Button */}
      {userLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={async () => {
              if (mapInstanceRef.current && userLocation) {
                try {
                  // Get fresh location
                  const freshLocation = await getUserLocation();
                  mapInstanceRef.current.setCenter(freshLocation);
                  mapInstanceRef.current.setZoom(15);
                  
                  // Update blue marker position
                  if (userLocationMarker) {
                    userLocationMarker.setPosition(freshLocation);
                  }
                  setUserLocation(freshLocation);
                } catch (error) {
                  // Fallback to stored location
                  mapInstanceRef.current.setCenter(userLocation);
                  mapInstanceRef.current.setZoom(15);
                }
              }
            }}
            className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
            title="Go to my current location"
          >
            <MapPin className="h-5 w-5 text-blue-600" />
          </button>
        </div>
      )}

      {/* Marker Count */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              {markers.length} markers
            </span>
          </div>
        </div>
      </div>

      {/* Clear All Button */}
      {markers.length > 0 && (
        <div className="absolute bottom-4 right-4 z-20">
          <button
            onClick={() => {
              setMarkers([]);
              markersRef.current.forEach(m => {
                if (m.marker) m.marker.setMap(null);
                if (m.infoWindow) m.infoWindow.close();
              });
              markersRef.current = [];
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear All
          </button>
        </div>
      )}

      {/* Safety Rating Popup */}
      {showSafetyPopup && pendingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5" />
                <h3 className="font-semibold">Add Safety Report</h3>
              </div>
              <button 
                onClick={() => {
                  setShowSafetyPopup(false);
                  setPendingLocation(null);
                  setDescription("");
                }} 
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How safe is this location?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {safetyLevels.map(level => (
                    <button
                      key={level.key}
                      onClick={() => setSelectedSafetyLevel(level.key as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedSafetyLevel === level.key
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">{level.icon}</span>
                      <span className="font-medium">{level.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Add details about this location..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSafetyPopup(false);
                    setPendingLocation(null);
                    setDescription("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (pendingLocation) {
                      setSavingMarker(true);
                      await addMarker(pendingLocation.lat, pendingLocation.lng, selectedSafetyLevel, description);
                      setSavingMarker(false);
                      setShowSafetyPopup(false);
                      setPendingLocation(null);
                      setDescription("");
                    }
                  }}
                  disabled={savingMarker}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {savingMarker ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
