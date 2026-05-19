import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Shield, AlertTriangle, Users, Star, Building2, Heart, GraduationCap, Utensils, Route, Target, Clock, X } from "lucide-react";
import { SimpleMapView } from "../components/common/SimpleMapView";
import { getNearbySafePlaces } from "../services/google-places";
import { getCurrentLocation, calculateDistance } from "../utils/location";
import { getGoaStaticPlaces, getDangerZones, dangerZonesList as dangerZones } from "../data/mockLocations";
interface SafePlace {
  name: string;
  distance: string;
  type: string;
  rating: number;
  color: string;
  lat: number;
  lng: number;
  place_id: string;
}

interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  safety_score: number;
}

interface SafeRoute {
  steps: RouteStep[];
  totalDistance: string;
  totalDuration: string;
  safetyScore: number;
  waypoints: SafePlace[];
}

export function LocationView() {
  const [safeSpots, setSafeSpots] = useState<SafePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [destination, setDestination] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [safeRoute, setSafeRoute] = useState<SafeRoute | null>(null);
  const [routeError, setRouteError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [showMapPopup, setShowMapPopup] = useState(false);

  // In-modal route map refs
  const routeMapContainerRef = useRef<HTMLDivElement | null>(null);
  const routeMapRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const [destLatLng, setDestLatLng] = useState<{lat: number, lng: number} | null>(null);



  // Use the new Google Places service (no CORS issues)
  const getNearbySafePlacesFromService = async (lat: number, lng: number) => {
    try {
      return await getNearbySafePlaces(lat, lng);
    } catch (error) {
      console.error('Error fetching safe places from service:', error);
      // Fallback to static data
      return getGoaStaticPlaces(lat, lng);
    }
  };



  const loadNearbySafePlaces = async () => {
    setLoading(true);
    setLocationError("");
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      
      // Try to get places from Google API first
      try {
        const places = await getNearbySafePlacesFromService(location.lat, location.lng);
        if (places.length > 0) {
          setSafeSpots(places);
          return;
        }
      } catch (error) {
        console.log('Google API failed, using static data:', error);
      }
      
      // Fallback to static data for Goa
      const staticPlaces = getGoaStaticPlaces(location.lat, location.lng);
      setSafeSpots(staticPlaces);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to access location. Please check your device settings.';
      console.error('Error loading nearby safe places:', message);
      setLocationError(message);
      // Final fallback
      setSafeSpots([
        {
          name: "Emergency Services",
          distance: "Call 100",
          type: "Police Station",
          rating: 5.0,
          color: "blue",
          lat: 0,
          lng: 0,
          place_id: "emergency"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };



  const calculateSafetyScore = (lat: number, lng: number) => {
    // Calculate safety score based on proximity to safe spots and danger zones
    let score = 50; // Base score
    
    // Add points for nearby safe spots
    safeSpots.forEach(spot => {
      const distance = calculateDistance(lat, lng, spot.lat, spot.lng);
      if (distance < 0.5) score += 20; // Very close to safe spot
      else if (distance < 1.0) score += 15; // Close to safe spot
      else if (distance < 2.0) score += 10; // Near safe spot
    });
    
    // Subtract points for danger zones
    const dangerZones = getDangerZones();
    dangerZones.forEach(zone => {
      const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
      if (distance < zone.radius) score -= 30; // In danger zone
      else if (distance < zone.radius * 2) score -= 15; // Near danger zone
    });
    
    return Math.max(0, Math.min(100, score));
  };

  const getSafeRoute = async (origin: {lat: number, lng: number}, destination: string) => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";
    
    try {
      // First, geocode the destination
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        throw new Error("Destination not found");
      }
      
      const destLocation = geocodeData.results[0].geometry.location;
      
      // Get directions with waypoints through safe spots
      const waypoints = safeSpots
        .filter(spot => {
          const distToOrigin = calculateDistance(origin.lat, origin.lng, spot.lat, spot.lng);
          const distToDest = calculateDistance(destLocation.lat, destLocation.lng, spot.lat, spot.lng);
          return distToOrigin < 3 && distToDest < 3; // Within 3km of route
        })
        .slice(0, 3) // Max 3 waypoints
        .map(spot => `${spot.lat},${spot.lng}`)
        .join('|');
      
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.lat},${origin.lng}&` +
        `destination=${destLocation.lat},${destLocation.lng}&` +
        `waypoints=${waypoints}&` +
        `mode=walking&` +
        `key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(directionsUrl);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        // Process route steps with safety scores
        const steps: RouteStep[] = route.legs.flatMap(leg => 
          leg.steps.map((step: any) => {
            const stepLocation = {
              lat: step.start_location.lat,
              lng: step.start_location.lng
            };
            const safetyScore = calculateSafetyScore(stepLocation.lat, stepLocation.lng);
            
            return {
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
              distance: step.distance.text,
              duration: step.duration.text,
              safety_score: safetyScore
            };
          })
        );
        
        const totalSafetyScore = steps.reduce((sum, step) => sum + step.safety_score, 0) / steps.length;
        
        return {
          steps,
          totalDistance: leg.distance.text,
          totalDuration: leg.duration.text,
          safetyScore: Math.round(totalSafetyScore),
          waypoints: safeSpots.filter(spot => 
            waypoints.includes(`${spot.lat},${spot.lng}`)
          )
        };
      } else {
        throw new Error("No route found");
      }
    } catch (error) {
      console.error("Error getting safe route:", error);
      throw error;
    }
  };

  const handlePlanSafeRoute = async () => {
    setRouteError("");
    setLocationError("");

    let location = userLocation;
    if (!location) {
      try {
        location = await getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Please allow location access to plan your route.";
        setRouteError(message);
        setLocationError(message);
        return;
      }
    }
    
    if (!destination.trim()) {
      setRouteError("Please enter a destination");
      return;
    }
    
    setRouteLoading(true);
    
    try {
      const route = await getSafeRoute(location, destination);
      setSafeRoute(route);
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : "Failed to plan route");
    } finally {
      setRouteLoading(false);
    }
  };

  const openGoogleMaps = () => {
    if (safeRoute && userLocation) {
      const waypoints = safeRoute.waypoints.map(spot => `${spot.lat},${spot.lng}`).join('|');
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${waypoints}/${destination}`;
      window.open(url, '_blank');
    }
  };

  // Initialize the full-screen map popup for picking destination and showing safest route
  useEffect(() => {
    if (!showMapPopup) return;
    
    const init = async () => {
      // Wait for DOM and Google Maps to be available
      await new Promise(r => setTimeout(r, 100));
      if (!routeMapContainerRef.current) return;
      if (!(window as any).google || !(window as any).google.maps) return;
      const google = (window as any).google;

      // Use current location or default to Goa
      const center = userLocation || { lat: 15.3268, lng: 73.9335 };

      routeMapRef.current = new google.maps.Map(routeMapContainerRef.current, {
        center,
        zoom: userLocation ? 15 : 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      directionsServiceRef.current = new google.maps.DirectionsService();
      directionsRendererRef.current = new google.maps.DirectionsRenderer({ 
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#10B981',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });
      directionsRendererRef.current.setMap(routeMapRef.current);

      // Add user location marker
      if (userLocation) {
        new google.maps.Marker({
          position: userLocation,
          map: routeMapRef.current,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3
          }
        });
      }

      // Add safe spots markers
      safeSpots.forEach(spot => {
        const marker = new google.maps.Marker({
          position: { lat: spot.lat, lng: spot.lng },
          map: routeMapRef.current,
          title: spot.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: spot.color === 'blue' ? '#3B82F6' : 
                      spot.color === 'red' ? '#EF4444' :
                      spot.color === 'green' ? '#10B981' :
                      spot.color === 'purple' ? '#8B5CF6' :
                      spot.color === 'orange' ? '#F97316' : '#6B7280',
            fillOpacity: 0.8,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${spot.name}</div>
              <div style="font-size: 12px; color: #666;">${spot.type}</div>
              <div style="font-size: 12px; color: #666;">${spot.distance}</div>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(routeMapRef.current, marker);
        });
      });

      // Add danger zones
      const dangerZones = getDangerZones();
      dangerZones.forEach(zone => {
        new google.maps.Circle({
          strokeColor: '#EF4444',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#EF4444',
          fillOpacity: 0.15,
          map: routeMapRef.current,
          center: { lat: zone.lat, lng: zone.lng },
          radius: zone.radius * 1000 // Convert km to meters
        });
      });

      // Click to drop destination pin and get route
      routeMapRef.current.addListener('click', async (e: any) => {
        const clicked = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setDestLatLng(clicked);
        setRouteLoading(true);

        // Clear previous destination marker
        if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null);
        
        // Add new destination marker
        destinationMarkerRef.current = new google.maps.Marker({
          position: clicked,
          map: routeMapRef.current,
          title: 'Destination',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#F59E0B',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3
          }
        });

        // Compute and render safest route
        if (userLocation) {
          await computeAndRenderSafestRoute(userLocation, clicked);
        }
        setRouteLoading(false);
      });
    };

    init();

    return () => {
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
      if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null);
      directionsServiceRef.current = null;
      directionsRendererRef.current = null;
      routeMapRef.current = null;
    };
  }, [showMapPopup, userLocation, safeSpots]);

  const computeAndRenderSafestRoute = async (origin: {lat: number, lng: number}, dest: {lat: number, lng: number}) => {
    const google = (window as any).google;
    if (!google || !directionsServiceRef.current) return;

    return new Promise<void>((resolve) => {
      directionsServiceRef.current.route(
        {
          origin,
          destination: dest,
          travelMode: google.maps.TravelMode.WALKING,
          provideRouteAlternatives: true
        },
        (result: any, status: any) => {
          if (status !== 'OK' || !result || !result.routes) {
            setRouteError('No route found');
            resolve();
            return;
          }

          // Score each alternative route by average step safety
          let bestRoute = result.routes[0];
          let bestScore = -Infinity;

          result.routes.forEach((r: any) => {
            const steps = r.legs.flatMap((leg: any) => leg.steps);
            let total = 0;
            let count = 0;
            steps.forEach((s: any) => {
              const loc = { lat: s.start_location.lat(), lng: s.start_location.lng() };
              total += calculateSafetyScore(loc.lat, loc.lng);
              count += 1;
            });
            const avg = count ? total / count : 0;
            if (avg > bestScore) {
              bestScore = avg;
              bestRoute = r;
            }
          });

          directionsRendererRef.current.setDirections({ routes: [bestRoute] });

          // Populate textual safeRoute for the modal list
          const leg = bestRoute.legs[0];
          const stepsData = bestRoute.legs.flatMap((leg: any) => 
            leg.steps.map((s: any) => ({
              instruction: s.instructions.replace(/<[^>]*>/g, ''),
              distance: s.distance.text,
              duration: s.duration.text,
              safety_score: calculateSafetyScore(s.start_location.lat(), s.start_location.lng())
            }))
          );

          const chosenWaypoints = safeSpots
            .filter(spot => calculateDistance(spot.lat, spot.lng, dest.lat, dest.lng) < 3)
            .slice(0, 3);

          setSafeRoute({
            steps: stepsData,
            totalDistance: leg.distance.text,
            totalDuration: leg.duration.text,
            safetyScore: Math.round(bestScore),
            waypoints: chosenWaypoints
          });
          setRouteError("");
          resolve();
        }
      );
    });
  };

  useEffect(() => {
    loadNearbySafePlaces();
  }, []);



  const getSpotColors = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'green': return 'bg-green-100 text-green-600';
      case 'red': return 'bg-red-100 text-red-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      case 'orange': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'Police Station': return <Building2 className="h-5 w-5" />;
      case 'Hospital': return <Heart className="h-5 w-5" />;
      case 'School':
      case 'College': return <GraduationCap className="h-5 w-5" />;
      case 'Restaurant': return <Utensils className="h-5 w-5" />;
      case 'Health Center': return <Heart className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Interactive Safety Map (Google Maps) */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="h-96">
          <SimpleMapView />
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl py-4 px-6 flex flex-col items-center gap-2 hover:from-green-600 hover:to-green-700 transition-colors">
          <Navigation className="h-6 w-6" />
          <span className="font-semibold">Navigate to Safe Spot</span>
        </button>
        <button 
          onClick={() => setShowMapPopup(true)}
          className="bg-white border border-gray-300 text-gray-700 rounded-xl py-4 px-6 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <Route className="h-6 w-6" />
          <span className="font-semibold">Plan Safe Route</span>
        </button>
      </div>

      {/* Nearby Safe Spots */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Nearby Safe Spots</h3>
          </div>
            <button
              onClick={loadNearbySafePlaces}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Within 5km radius of your location</p>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Finding safe places near you...</p>
            </div>
          ) : safeSpots.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No safe places found nearby</p>
              <p className="text-sm text-gray-400">Try refreshing or check your location permissions</p>
            </div>
          ) : (
            safeSpots.map((spot, index) => (
              <div key={spot.place_id || index} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getSpotColors(spot.color)}`}>
                  {getPlaceIcon(spot.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{spot.name}</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500">{spot.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{spot.type} • {spot.distance}</p>
              </div>
                <button 
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => {
                    // Open in Google Maps
                    const url = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
                    window.open(url, '_blank');
                  }}
                >
                Navigate
              </button>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Danger Zones Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-800">Avoid These Areas</h3>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {dangerZones.map((zone, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-orange-800">{zone.location}</p>
                <p className="text-sm text-orange-600">
                  {zone.reports} reports • {zone.distance} • Last: {zone.lastReported}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Stats */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Community Activity</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">1,247</p>
              <p className="text-sm text-gray-500">Active Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">89</p>
              <p className="text-sm text-gray-500">Safe Spots</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">342</p>
              <p className="text-sm text-gray-500">Reports Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Map Popup for Safe Route Planning */}
      {showMapPopup && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header with close button */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Route className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Plan Safe Route</h3>
              </div>
              <button 
                onClick={() => {
                  setShowMapPopup(false);
                  setSafeRoute(null);
                  setDestLatLng(null);
                  setRouteError("");
                }} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="px-4 pb-3">
              <p className="text-sm text-gray-600">Click anywhere on the map to set your destination and get the safest route</p>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 pt-20">
            <div ref={routeMapContainerRef} className="w-full h-full" />
          </div>
          
          {/* Route Info Panel */}
          {safeRoute && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-h-80 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Route Summary */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">Safe Route Found!</h4>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Safety Score: {safeRoute.safetyScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{safeRoute.totalDistance}</p>
                      <p className="text-sm text-gray-500">Total Distance</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{safeRoute.totalDuration}</p>
                      <p className="text-sm text-gray-500">Estimated Time</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{safeRoute.waypoints.length}</p>
                      <p className="text-sm text-gray-500">Safe Waypoints</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={openGoogleMaps}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    Open in Google Maps
                  </button>
                  <button
                    onClick={() => setShowMapPopup(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {routeLoading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Planning your safe route...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}