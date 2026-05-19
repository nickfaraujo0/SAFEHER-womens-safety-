export const getCurrentLocation = () => {
  return new Promise<{lat: number, lng: number}>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      reject(new Error('Location access requires a secure connection. Open the app over HTTPS or use localhost.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        let message = 'Unable to get your location. Please allow location access.';

        if (error?.code === 1) {
          message = 'Location permission denied. Please enable location access in your browser settings.';
        } else if (error?.code === 2) {
          message = 'Location information is unavailable. Please try again in a different spot.';
        } else if (error?.code === 3) {
          message = 'Location request timed out. Please try again.';
        } else if (typeof error?.message === 'string') {
          message = error.message;
        }

        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
