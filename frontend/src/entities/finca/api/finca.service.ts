import api from '@/shared/api/client';
import { ApiResponse, PaginatedResponse } from '@/shared/api/generated/swaggerTypes';
import type { FincaImage } from "@/entities/finca/api/fincaImage.service";

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
  /** Estado de la sesión actual frente a la finca; ausente si no hay sesión. */
  is_member?: boolean;
  already_requested?: boolean;
}

/**
 * Live livestock counters exposed by GET /fincas/public/{id} when the finca
 * sets its public visibility to "full".
 */
export interface LivestockSummary {
  total_animals: number;
  active_animals: number;
  male_count: number;
  female_count: number;
  sick_animals: number;
}

/**
 * Public finca detail. Stats are optional: fincas with "minimal" visibility
 * omit them entirely.
 */
export interface FincaDetail extends Finca {
  animals_count?: number;
  livestock_summary?: LivestockSummary;
  members_count?: number;
  total_fields?: number;
  /** Galería pública; se sirve desde /finca-images/{id}. */
  images?: FincaImage[];
  last_activity?: string;
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
  async getPublicFincas(filters?: FincaSearchFilters, options?: { skipCache?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = `/fincas/public${queryString ? `?${queryString}` : ''}`;

    // is_member / already_requested dependen de la sesión: tras enviar una
    // solicitud hay que releer sin caché para que la tarjeta cambie de estado.
    const response = options?.skipCache
      ? await api.get<PaginatedResponse<Finca>>(url, { skipCache: true } as never)
      : await api.get<PaginatedResponse<Finca>>(url);
    return response.data;
  },

  /**
   * Obtener detalles públicos de una finca específica
   */
  async getPublicFincaDetail(id: number) {
    const response = await api.get<ApiResponse<Finca>>(`/fincas/public/${id}`);
    return response.data;
  },

  /**
   * Crear una nueva finca como usuario existente (logueado).
   * El usuario se asigna como Propietario/Administrador según el tipo.
   * La finca activa no cambia automáticamente.
   */
  async createFinca(data: {
    name: string;
    type: 'Educativa' | 'Tradicional';
    nit?: string;
    department?: string;
    municipality?: string;
    address?: string;
  }) {
    const response = await api.post<ApiResponse<{
      finca_id: number;
      finca_name: string;
      finca_type: string;
      role: string;
      message: string;
    }>>('/multi-finca/create', data);
    return response.data;
  },

  /** Guarda las coordenadas GPS de una finca. */
  async updateLocation(
    fincaId: number,
    coords: { latitude: number; longitude: number },
  ) {
    const response = await api.patch<ApiResponse<Finca>>(`/fincas/${fincaId}/location`, coords);
    return response.data;
  }
};
