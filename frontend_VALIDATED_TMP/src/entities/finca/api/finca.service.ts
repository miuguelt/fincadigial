import api from '@/shared/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/api/generated/swaggerTypes';

export interface Finca {
  id: number;
  name: string;
  type: string;
  location?: string;
  logo_url?: string;
  department?: string;
  municipality?: string;
  address?: string;
  nit?: string;
  created_at?: string;
}

export interface FincaSearchFilters {
  search?: string;
  type?: 'Educativa' | 'Tradicional';
  department?: string;
  page?: number;
  limit?: number;
}

export const fincaService = {
  /**
   * Obtener todas las fincas públicas/disponibles para unirse
   */
  async getAll() {
    const response = await api.get<ApiResponse<Finca[]>>('/fincas');
    return response.data;
  },

  /**
   * Obtener detalle de una finca
   */
  async getById(id: number) {
    const response = await api.get<ApiResponse<Finca>>(`/fincas/${id}`);
    return response.data;
  },

  /**
   * Listar fincas públicas disponibles para solicitar membresía
   * No requiere autenticación
   */
  async getPublicFincas(filters?: FincaSearchFilters) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = `/fincas/public${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<PaginatedResponse<Finca>>(url);
    return response.data;
  },

  /**
   * Obtener detalles públicos de una finca específica
   */
  async getPublicFincaDetail(id: number) {
    const response = await api.get<ApiResponse<Finca>>(`/fincas/public/${id}`);
    return response.data;
  }
};
