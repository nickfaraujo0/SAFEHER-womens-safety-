import { calculateDistance } from "../utils/location";

export const getStaticLandmarks = (lat: number, lng: number) => {
  if (lat >= 15.2 && lat <= 15.5 && lng >= 73.7 && lng <= 74.0) {
    return 'Padre Conceicao College, Verna Industrial Estate';
  } else if (lat >= 15.4 && lat <= 15.6 && lng >= 73.8 && lng <= 74.0) {
    return 'Panaji Police Station, Goa Medical College';
  } else if (lat >= 15.2 && lat <= 15.4 && lng >= 73.9 && lng <= 74.1) {
    return 'Margao Railway Station, Hospicio Hospital';
  } else {
    return 'Goa Medical College, Dabolim Airport';
  }
};

export const getGoaStaticPlaces = (lat: number, lng: number) => {
  const staticPlaces = [
    {
      name: "Panaji Police Station",
      distance: calculateDistance(lat, lng, 15.4909, 73.8278).toFixed(1) + " km",
      type: "Police Station",
      rating: 4.2,
      color: "blue",
      lat: 15.4909,
      lng: 73.8278,
      place_id: "goa_police_1"
    },
    {
      name: "Goa Medical College",
      distance: calculateDistance(lat, lng, 15.4569, 73.8035).toFixed(1) + " km",
      type: "Hospital",
      rating: 4.5,
      color: "red",
      lat: 15.4569,
      lng: 73.8035,
      place_id: "goa_hospital_1"
    },
    {
      name: "Padre Conceicao College",
      distance: calculateDistance(lat, lng, 15.3268, 73.9335).toFixed(1) + " km",
      type: "College",
      rating: 4.3,
      color: "green",
      lat: 15.3268,
      lng: 73.9335,
      place_id: "goa_college_1"
    },
    {
      name: "Verna Police Station",
      distance: calculateDistance(lat, lng, 15.3500, 73.9500).toFixed(1) + " km",
      type: "Police Station",
      rating: 4.1,
      color: "blue",
      lat: 15.3500,
      lng: 73.9500,
      place_id: "goa_police_2"
    },
    {
      name: "Nuvem Health Center",
      distance: calculateDistance(lat, lng, 15.3200, 73.9200).toFixed(1) + " km",
      type: "Health Center",
      rating: 4.0,
      color: "orange",
      lat: 15.3200,
      lng: 73.9200,
      place_id: "goa_health_1"
    },
    {
      name: "McDonald's Verna",
      distance: calculateDistance(lat, lng, 15.3400, 73.9400).toFixed(1) + " km",
      type: "Restaurant",
      rating: 4.2,
      color: "purple",
      lat: 15.3400,
      lng: 73.9400,
      place_id: "goa_restaurant_1"
    },
    {
      name: "Margao Police Station",
      distance: calculateDistance(lat, lng, 15.2730, 73.9589).toFixed(1) + " km",
      type: "Police Station",
      rating: 4.3,
      color: "blue",
      lat: 15.2730,
      lng: 73.9589,
      place_id: "goa_police_3"
    },
    {
      name: "Hospicio Hospital",
      distance: calculateDistance(lat, lng, 15.2700, 73.9600).toFixed(1) + " km",
      type: "Hospital",
      rating: 4.4,
      color: "red",
      lat: 15.2700,
      lng: 73.9600,
      place_id: "goa_hospital_2"
    },
    {
      name: "Damodar College",
      distance: calculateDistance(lat, lng, 15.2800, 73.9700).toFixed(1) + " km",
      type: "College",
      rating: 4.1,
      color: "green",
      lat: 15.2800,
      lng: 73.9700,
      place_id: "goa_college_2"
    },
    {
      name: "Pizza Hut Verna",
      distance: calculateDistance(lat, lng, 15.3300, 73.9300).toFixed(1) + " km",
      type: "Restaurant",
      rating: 4.0,
      color: "purple",
      lat: 15.3300,
      lng: 73.9300,
      place_id: "goa_restaurant_2"
    }
  ];

  return staticPlaces
    .filter(place => parseFloat(place.distance) <= 5.0)
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
    .slice(0, 15);
};

export const getDangerZones = () => {
  return [
    { lat: 15.3000, lng: 73.9000, radius: 0.5, name: "Industrial Area" },
    { lat: 15.2800, lng: 73.9200, radius: 0.3, name: "Isolated Park" },
    { lat: 15.3100, lng: 73.9500, radius: 0.4, name: "Dark Alley" }
  ];
};

export const dangerZonesList = [
  {
    location: "Park Avenue Underpass",
    distance: "0.8 km",
    reports: 12,
    lastReported: "2 hours ago"
  },
  {
    location: "Industrial Area (Block 5)",
    distance: "1.2 km", 
    reports: 8,
    lastReported: "1 day ago"
  }
];
