import { supabase } from '../utils/supabase/client';

export interface CommunityReport {
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

// Get latest community reports
export const getLatestCommunityReports = async (limit: number = 5): Promise<CommunityReport[]> => {
  try {
    // For now, we'll use static data since we don't have a reports table yet
    // In the future, this would fetch from a community_reports table
    return getStaticCommunityReports().slice(0, limit);
  } catch (error) {
    console.error('Error fetching community reports:', error);
    return getStaticCommunityReports().slice(0, limit);
  }
};

// Get static community reports (fallback)
export const getStaticCommunityReports = (): CommunityReport[] => {
  return [
    {
      id: "1",
      type: "safety",
      title: "Well-lit bus stop with CCTV",
      location: "Central Avenue Bus Stop",
      time: "2 hours ago",
      author: "Anonymous",
      upvotes: 15,
      verified: true,
      description: "This bus stop has excellent lighting and CCTV coverage, making it safe for late-night commuters.",
      is_anonymous: true
    },
    {
      id: "2",
      type: "danger", 
      title: "Poor lighting and isolated area",
      location: "Industrial Park Entrance",
      time: "4 hours ago",
      author: "Sarah M.",
      upvotes: 8,
      verified: false,
      description: "The area is poorly lit and isolated, making it unsafe for women walking alone.",
      is_anonymous: false
    },
    {
      id: "3",
      type: "danger",
      title: "Harassment incident reported",
      location: "Downtown Metro Station",
      time: "6 hours ago", 
      author: "Anonymous",
      upvotes: 23,
      verified: true,
      description: "Multiple harassment incidents have been reported in this area. Please be cautious.",
      is_anonymous: true
    },
    {
      id: "4",
      type: "safety",
      title: "24/7 security guard present",
      location: "University Campus Gate",
      time: "8 hours ago",
      author: "Priya K.",
      upvotes: 12,
      verified: true,
      description: "There's always a security guard at this gate, and the area is well-monitored.",
      is_anonymous: false
    },
    {
      id: "5",
      type: "safety",
      title: "Safe parking area with good lighting",
      location: "Mall Parking Lot A",
      time: "12 hours ago",
      author: "Anonymous",
      upvotes: 6,
      verified: false,
      description: "This parking area is well-lit and has security cameras. Safe for late-night parking.",
      is_anonymous: true
    }
  ];
};

// Format report for community updates display
export const formatReportForUpdates = (report: CommunityReport) => {
  const isSafety = report.type === 'safety';
  const isDanger = report.type === 'danger';
  
  return {
    id: report.id,
    type: isSafety ? 'safe' : 'danger',
    title: isSafety ? 'Safe Spot Added' : 'Safety Alert',
    description: report.description || report.title,
    location: report.location,
    time: report.time,
    author: report.is_anonymous ? 'Anonymous' : report.author,
    upvotes: report.upvotes,
    verified: report.verified,
    icon: isSafety ? 'Shield' : 'AlertTriangle',
    bgColor: isSafety ? 'bg-green-50' : 'bg-orange-50',
    borderColor: isSafety ? 'border-green-200' : 'border-orange-200',
    textColor: isSafety ? 'text-green-800' : 'text-orange-800',
    descColor: isSafety ? 'text-green-700' : 'text-orange-700',
    timeColor: isSafety ? 'text-green-600' : 'text-orange-600',
    iconColor: isSafety ? 'text-green-600' : 'text-orange-600'
  };
};

// Get community stats
export const getCommunityStats = () => {
  const reports = getStaticCommunityReports();
  const safetyReports = reports.filter(r => r.type === 'safety').length;
  const dangerReports = reports.filter(r => r.type === 'danger').length;
  const totalUpvotes = reports.reduce((sum, r) => sum + r.upvotes, 0);
  const verifiedReports = reports.filter(r => r.verified).length;
  
  return {
    totalReports: reports.length,
    safetyReports,
    dangerReports,
    totalUpvotes,
    verifiedReports,
    activeUsers: 1247, // Static for now
    safeSpots: 89, // Static for now
    reportsToday: 342 // Static for now
  };
};
