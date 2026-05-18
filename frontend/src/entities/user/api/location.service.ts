import api from '@/shared/api/client';
import { ApiResponse } from '@/shared/api/generated/swaggerTypes';

export interface UserLocation {
  id: number;
  user_id: number;
  finca_id: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  detection_method: string;
  reported_by_node_id?: string;
  created_at: string;
}

export const locationService = {
  /**
   * Reportar ubicación actual
   */
  async reportLocation(data: { latitude: number; longitude: number; accuracy?: number }) {
    // Si estamos offline, esto se encolará automáticamente por el client/offlineQueue
    const response = await api.post<ApiResponse<void>>('/location/report', data);
    return response.data;
  },

  /**
   * Obtener últimas posiciones conocidas de los trabajadores
   */
  async getLatestPositions() {
    const response = await api.get<ApiResponse<UserLocation[]>>('/location/latest');
    return response.data;
  }
};
