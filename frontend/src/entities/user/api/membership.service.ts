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
    const response = await api.get<ApiResponse<MembershipRequest[]>>('/membership/pending');
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
    const response = await api.get<ApiResponse<{ count: number }>>('/membership/pending/count');
    return response.data;
  }
};
