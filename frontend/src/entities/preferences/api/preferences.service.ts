import { apiFetch } from '@/shared/api/apiFetch';

export interface FavoriteItem {
  id: number;
  endpoint: string;
  label: string;
  method: string;
  created_at: string;
}

export interface HistoryItem {
  id: number;
  endpoint: string;
  label: string;
  method: string;
  created_at: string;
}

class PreferencesService {
  private baseUrl = '/api/v1/preferences';

  async getFavorites(): Promise<FavoriteItem[]> {
    const response = await apiFetch({
      url: `${this.baseUrl}/favorites`,
      method: 'GET',
    });
    return response as unknown as FavoriteItem[];
  }

  async addFavorite(data: { endpoint: string; label: string; method: string }): Promise<FavoriteItem> {
    const response = await apiFetch({
      url: `${this.baseUrl}/favorites`,
      method: 'POST',
      data,
    });
    return response as unknown as FavoriteItem;
  }

  async removeFavorite(id: number): Promise<void> {
    await apiFetch({
      url: `${this.baseUrl}/favorites/${id}`,
      method: 'DELETE',
    });
  }

  async clearFavorites(): Promise<void> {
    await apiFetch({
      url: `${this.baseUrl}/favorites`,
      method: 'DELETE',
    });
  }

  async getHistory(limit: number = 20): Promise<HistoryItem[]> {
    const response = await apiFetch({
      url: `${this.baseUrl}/history`,
      method: 'GET',
      params: { limit },
    });
    return response as unknown as HistoryItem[];
  }

  async addToHistory(data: { endpoint: string; label: string; method: string }): Promise<HistoryItem> {
    const response = await apiFetch({
      url: `${this.baseUrl}/history`,
      method: 'POST',
      data,
    });
    return response as unknown as HistoryItem;
  }
}

export const preferencesService = new PreferencesService();
export default preferencesService;
