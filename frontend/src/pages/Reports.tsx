import React, { useState, useEffect, useRef } from "react";
import { Plus, Shield, AlertTriangle, ThumbsUp, Clock, MapPin, X, User, Eye, EyeOff } from "lucide-react";
import { getUserSafetyReports } from "../services/api";
import { getStaticCommunityReports, CommunityReport as SharedCommunityReport } from "../services/community-reports";
import { getCurrentUser } from "../utils/auth";
import { getCurrentLocation } from "../utils/location";

interface SafetyReport {
  id: string;
  latitude: number;
  longitude: number;
  safety_level: string;
  description?: string;
  created_at: string;
  author_name?: string;
  is_anonymous?: boolean;
}

interface CommunityReport {
  id: string;
  type: string;
  title: string;
  location: string;
  time: string;
  author: string;
  upvotes: number;
  verified: boolean;
  description?: string;
  latitude?: number;
  longitude?: number;
  is_anonymous?: boolean;
}

export function ReportsView() {
  const [activeTab, setActiveTab] = useState("community");
  const [userReports, setUserReports] = useState<SafetyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'safety' | 'danger'>('safety');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);



  // Load user's safety reports
  useEffect(() => {
    const loadUserReports = async () => {
      const user = getCurrentUser();
      if (!user?.id) return;

      setLoadingReports(true);
      try {
        const reportsData = await getUserSafetyReports(user.id);
        setUserReports(reportsData || []);
      } catch (error) {
        console.error("Error loading user reports:", error);
      } finally {
        setLoadingReports(false);
      }
    };

    loadUserReports();
  }, []);

  // Use shared community reports service
  const recentReports: SharedCommunityReport[] = getStaticCommunityReports();

  const myReports = [
    {
      id: 1,
      title: "Safe cafe with female-friendly staff",
      location: "Corner Café, Main Street",
      time: "1 day ago",
      status: "Verified",
      upvotes: 12
    },
    {
      id: 2,
      title: "Inadequate lighting on walking path",
      location: "University Campus Path",
      time: "3 days ago", 
      status: "Under Review",
      upvotes: 7
    }
  ];

  const getReportIcon = (type: string) => {
    switch (type) {
      case "safety":
        return <Shield className="h-4 w-4 text-green-600" />;
      case "danger":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "incident":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getReportColor = (type: string) => {
    switch (type) {
      case "safety":
        return "border-green-200 bg-green-50";
      case "danger":
        return "border-orange-200 bg-orange-50";
      case "incident":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getSafetyLevelConfig = (level: string) => {
    const configs = {
      safe: { icon: '🟢', label: 'Safe', color: 'text-green-600' },
      moderate: { icon: '🟡', label: 'Moderate', color: 'text-yellow-600' },
      unsafe: { icon: '🟠', label: 'Unsafe', color: 'text-orange-600' },
      dangerous: { icon: '🔴', label: 'Dangerous', color: 'text-red-600' }
    };
    return configs[level as keyof typeof configs] || configs.safe;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };



  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      
      const locality = data.localityInfo?.administrative || [];
      const city = data.city || locality[1]?.name || '';
      const area = locality[2]?.name || locality[1]?.name || '';
      const neighborhood = locality[3]?.name || locality[2]?.name || '';
      
      let locationParts: string[] = [];
      if (neighborhood && neighborhood !== area) locationParts.push(neighborhood);
      if (area && area !== city) locationParts.push(area);
      if (city) locationParts.push(city);
      
      return locationParts.length > 0 ? locationParts.join(', ') : 'Unknown Location';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Unknown Location';
    }
  };

  const handleLocationPick = async () => {
    try {
      const location = await getCurrentLocation();
      const address = await reverseGeocode(location.lat, location.lng);
      setSelectedLocation(location);
      setReportLocation(address);
      setShowLocationPicker(false);
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please enter it manually.');
    }
  };

  const submitReport = async () => {
    if (!reportTitle.trim() || !reportDescription.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmittingReport(true);
    try {
      const user = getCurrentUser();
      const authorName = isAnonymous ? 'Anonymous' : (user?.name || 'Unknown User');
      
      // Create a new community report
      const newReport: CommunityReport = {
        id: Date.now().toString(),
        type: reportType,
        title: reportTitle,
        location: reportLocation || 'Location not specified',
        time: 'Just now',
        author: authorName,
        upvotes: 0,
        verified: false,
        description: reportDescription,
        latitude: selectedLocation?.lat,
        longitude: selectedLocation?.lng,
        is_anonymous: isAnonymous
      };

      // Add to community reports (this will be reflected in the homepage)
      setCommunityReports(prev => [newReport, ...prev]);

      // Reset form
      setReportTitle('');
      setReportDescription('');
      setReportLocation('');
      setSelectedLocation(null);
      setIsAnonymous(false);
      setShowReportModal(false);

      alert('Report submitted successfully!');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Report Button */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
        <button 
          onClick={() => setShowReportModal(true)}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl py-4 px-6 flex items-center justify-center gap-2 mb-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold">Report Safety Issue or Safe Spot</span>
        </button>
        <p className="text-center text-sm text-gray-500">
          Help keep our community safe by sharing your experiences
        </p>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button 
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "community" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("community")}
          >
            Community Reports
          </button>
          <button 
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "mine" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("mine")}
          >
            My Reports
          </button>
        </div>

        {activeTab === "community" ? (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">156</p>
                <p className="text-sm text-gray-500">Safe Spots</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">23</p>
                <p className="text-sm text-gray-500">Alerts</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-600">8</p>
                <p className="text-sm text-gray-500">Incidents</p>
              </div>
            </div>

                    {/* Recent Reports */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Recent Community Reports</h3>
                      {[...communityReports, ...recentReports].map((report) => (
                        <div key={report.id} className={`border rounded-xl p-4 ${getReportColor(report.type)}`}>
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {getReportIcon(report.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{report.title}</h4>
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
                              {report.description && (
                                <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{report.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{report.time}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-gray-500">by {report.author}</p>
                                  {report.is_anonymous && (
                                    <EyeOff className="h-3 w-3 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700">
                                    <ThumbsUp className="h-3 w-3" />
                                    {report.upvotes}
                                  </button>
                                  <button className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700">
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* My Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{userReports.length}</p>
                <p className="text-sm text-gray-500">Total Reports</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{userReports.length * 5}</p>
                <p className="text-sm text-gray-500">Community Points</p>
              </div>
            </div>

            {/* My Reports */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">My Safety Reports</h3>
              {loadingReports ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading your reports...</p>
                </div>
              ) : userReports.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No safety reports yet</p>
                  <p className="text-sm text-gray-400">Click on the map to add your first safety report!</p>
                </div>
              ) : (
                userReports.map((report) => {
                  const safetyConfig = getSafetyLevelConfig(report.safety_level);
                  return (
                    <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <span className="text-lg">{safetyConfig.icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{safetyConfig.label} Location</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${safetyConfig.color} bg-gray-100`}>
                              {safetyConfig.label}
                            </span>
                          </div>
                          {report.description && (
                            <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimeAgo(report.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-900 text-white">
                              Active
                            </span>
                            <button className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700">
                              View on Map
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Submission Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="flex items-center gap-3">
                <Plus className="h-6 w-6" />
                <h3 className="text-xl font-semibold">Report Safety Issue or Safe Spot</h3>
              </div>
              <button 
                onClick={() => {
                  setShowReportModal(false);
                  setReportTitle('');
                  setReportDescription('');
                  setReportLocation('');
                  setSelectedLocation(null);
                  setIsAnonymous(false);
                }} 
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Report Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What type of report is this?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setReportType('safety')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                      reportType === 'safety'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Safe Spot</span>
                  </button>
                  <button
                    onClick={() => setReportType('danger')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                      reportType === 'danger'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Safety Issue</span>
                  </button>
                </div>
              </div>

              {/* Report Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Brief description of the issue or safe spot"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter location or click to use current location"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                  />
                  <button
                    onClick={handleLocationPick}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Use Current
                  </button>
                </div>
                {selectedLocation && (
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Provide detailed information about this location..."
                  rows={4}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </div>

              {/* Anonymous Option */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isAnonymous 
                      ? 'border-purple-500 bg-purple-500' 
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {isAnonymous && <span className="text-white text-xs">✓</span>}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Post anonymously</p>
                  <p className="text-xs text-gray-500">Your name will not be shown to other users</p>
                </div>
                {isAnonymous ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <User className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReport}
                  disabled={submittingReport || !reportTitle.trim() || !reportDescription.trim()}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}