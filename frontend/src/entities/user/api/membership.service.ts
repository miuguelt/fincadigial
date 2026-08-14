import api from '@/shared/api/client';
import { ApiResponse } from '@/shared/api/generated/swaggerTypes';

export interface MembershipRequest {
  id: number;
  user_id: number;
  finca_id: number;
  requested_role: string;
  message?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  user?: {
    fullname: string;
    identification: string;
    email: string;
  };
}

export const membershipService = {
  /**
   * Enviar una solicitud para unirse a una finca
   */
  async sendRequest(data: { finca_id: number; requested_role: string; message?: string }) {
    const response = await api.post<ApiResponse<MembershipRequest>>('/membership/request', data);
    return response.data;
  },

  /**
   * Obtener solicitudes pendientes para la finca actual
   */
  async getPendingRequests() {
    const response = await api.get<ApiResponse<MembershipRequest[]>>('/membership/pending', { skipCache: true } as any);
    return response.data;
  },

  /**
   * Aprobar una solicitud de membresía
   */
  async approveRequest(requestId: number, data: { role: string }) {
    const response = await api.post<ApiResponse<void>>(`/membership/${requestId}/approve`, data);
    return response.data;
  },

  /**
   * Rechazar una solicitud de membresía
   */
  async rejectRequest(requestId: number) {
    const response = await api.post<ApiResponse<void>>(`/membership/${requestId}/reject`, {});
    return response.data;
  },

  /**
   * Obtener contador de solicitudes pendientes
   */
  async getPendingCount() {
    const response = await api.get<ApiResponse<{ count: number }>>('/membership/pending/count', { skipCache: true } as any);
    return response.data;
  },

  /**
   * Obtener solicitudes pendientes e invitaciones recibidas
   */
  async getPendingGestions() {
    const response = await api.get<ApiResponse<{ requests_to_approve: any[]; invitations_received: any[] }>>('/membership/requests/pending', { skipCache: true } as any);
    return response.data;
  },

  /**
   * Enviar una solicitud de membresía directa
   */
  async createGestion(data: { finca_id: number; requested_role?: string; notes?: string }) {
    const response = await api.post<ApiResponse<any>>('/membership/requests', data);
    return response.data;
  },

  /**
   * Responder a una gestión (aprobar/rechazar)
   */
  async respondGestion(requestId: number, approve: boolean) {
    const response = await api.post<ApiResponse<void>>(`/membership/requests/${requestId}/respond`, { approve });
    return response.data;
  },

  /**
   * Buscar usuarios registrados en el sistema por nombre, correo o identificación
   */
  async searchUsers(query: string) {
    const response = await api.get<ApiResponse<any[]>>(`/membership/search-users?q=${encodeURIComponent(query)}`);
    return response.data;
  }
};
