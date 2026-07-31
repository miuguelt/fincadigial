import api from '@/shared/api/client';
import type { WeatherDashboard, WeatherAlert, WeatherRecord, WeatherUpdateResult } from '../model/types';

export const weatherService = {
  getDashboard: async (fincaId: number, days = 7): Promise<WeatherDashboard> => {
    const response = await api.get(`/weather/dashboard/${fincaId}`, {
      params: { days },
    });
    return response.data.data;
  },

  getCurrent: async (fincaId: number): Promise<{ record: WeatherRecord | null; alerts_generated: number }> => {
    const response = await api.get(`/weather/current/${fincaId}`);
    return response.data.data;
  },

  getAlerts: async (fincaId: number): Promise<WeatherAlert[]> => {
    const response = await api.get(`/weather/alerts/${fincaId}`);
    return response.data.data;
  },

  dismissAlert: async (fincaId: number, alertId: number): Promise<{ message: string }> => {
    const response = await api.post(`/weather/alerts/${fincaId}`, { alert_id: alertId });
    return response.data.data;
  },

  getHistory: async (fincaId: number, days = 7): Promise<WeatherRecord[]> => {
    const response = await api.get(`/weather/history/${fincaId}`, {
      params: { days },
    });
    return response.data.data;
  },

  updateAll: async (): Promise<WeatherUpdateResult> => {
    const response = await api.post('/weather/update-all');
    return response.data.data;
  },
};
