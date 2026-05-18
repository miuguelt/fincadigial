import { useEffect } from 'react';
import { User } from "@/entities/user/model/types";
import { locationService } from "@/entities/user/api/location.service";
import { geofenceService } from "@/shared/api/offline/GeofenceService";

export const useLocationSync = (user: User | null, isAuthenticated: boolean) => {
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const reportLocation = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            geofenceService.checkLocation(latitude, longitude);
            try {
              await locationService.reportLocation({ latitude, longitude, accuracy });
            } catch { /* ignore */ }
          },
          (error) => console.warn('[Location] Error al obtener posición:', error.message),
          { enableHighAccuracy: false, timeout: 10000 }
        );
      }
    };

    geofenceService.refreshFences();
    reportLocation();
    const interval = setInterval(reportLocation, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);
};

