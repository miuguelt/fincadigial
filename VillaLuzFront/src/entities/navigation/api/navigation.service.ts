import { apiFetch } from '@/shared/api/apiFetch';

export interface NavigationGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  endpoints: Array<{
    method: string;
    path: string;
    description: string;
    requires_auth: boolean;
    permissions: string[];
  }>;
  count: number;
}

export interface NavigationStructure {
  version: string;
  base_url: string;
  groups: NavigationGroup[];
}

class NavigationService {
  private baseUrl = '/api/v1/navigation';

  async getStructure(): Promise<NavigationStructure> {
    const response = await apiFetch({
      url: `${this.baseUrl}/structure`,
      method: 'GET',
    });
    return response as unknown as NavigationStructure;
  }

  async getQuickAccess(): Promise<any> {
    const response = await apiFetch({
      url: `${this.baseUrl}/quick-access`,
      method: 'GET',
    });
    return response as unknown as any;
  }
}

export const navigationService = new NavigationService();
export default navigationService;
