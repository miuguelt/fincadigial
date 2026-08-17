// import { toast } from 'react-toastify'; // Asumiendo que se usa para notificaciones
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';

export interface FincaGeofence {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  state: string;
}

export class GeofenceService {
  private fences: FincaGeofence[] = [];
  private currentInsideFenceId: number | null = null;

  /**
   * Carga los potreros con coordenadas desde el servidor (o caché)
   */
  async refreshFences() {
    try {
      const res = await (animalFieldsService as any).getAnimalFields(); // Asumiendo que existe el método
      const data = res.items || res.data?.items || [];

      this.fences = data
        .filter((f: any) => f.latitude && f.longitude)
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          latitude: f.latitude,
          longitude: f.longitude,
          radius: f.radius_meters || 50,
          state: f.state
        }));

    } catch (error) {
      console.error('[Geofence] Error al cargar geocercas:', error);
    }
  }

  /**
   * Verifica la posición actual contra las geocercas
   */
  checkLocation(lat: number, lng: number) {
    if (this.fences.length === 0) return;

    for (const fence of this.fences) {
      const distance = this.calculateDistance(lat, lng, fence.latitude, fence.longitude);

      if (distance <= fence.radius) {
        if (this.currentInsideFenceId !== fence.id) {
          this.onEnterFence(fence);
          this.currentInsideFenceId = fence.id;
        }
        return;
      }
    }

    if (this.currentInsideFenceId !== null) {
      this.currentInsideFenceId = null;
      console.log('[Geofence] Has salido de la zona controlada.');
    }
  }

  private onEnterFence(fence: FincaGeofence) {
    console.warn(`[Geofence] Entrando a: ${fence.name} (Estado: ${fence.state})`);

    if (fence.state === 'Restringido' || fence.state === 'Mantenimiento' || fence.state === 'Dañado') {
      // Alerta Crítica
      try {
        if ('vibrate' in navigator) navigator.vibrate([500, 200, 500]);

        // Notificación visual (Placeholder si toast no está configurado igual)
        alert(`⚠️ ZONA DE PELIGRO: Has ingresado a ${fence.name}. Estado: ${fence.state}. Por favor retírate inmediatamente.`);
      } catch { /* noop */ }
    }
  }

  /**
   * Haversine formula para distancia en metros
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const geofenceService = new GeofenceService();
