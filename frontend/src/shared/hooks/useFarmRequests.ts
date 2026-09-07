import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/useAuth';

export interface FarmRequest {
  id: number;
  type: 'INVITE' | 'REQUEST';
  farm_id: number;
  farm_name: string;
  user_id: number;
  user_name: string;
  avatar_url?: string | null;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  role?: string;
  created_at: string;
}

export function useFarmRequests() {
  const { user, refreshUserData } = useAuth();
  const [received, setReceived] = useState<FarmRequest[]>([]);
  const [sent, setSent] = useState<FarmRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Cargar tanto invitaciones como solicitudes de membresía pendientes
      const [resInv, resMem] = await Promise.all([
        apiClient.get('/invitations/pending').catch(() => ({ data: { data: { sent: [], received: [] } } })),
        apiClient.get('/membership/requests/pending').catch(() => ({ data: { data: { requests_to_approve: [], invitations_received: [] } } })),
      ]);

      const invReceived = resInv.data?.data?.received || [];
      const memToApprove = resMem.data?.data?.requests_to_approve || [];
      const invSent = resInv.data?.data?.sent || [];

      // Mapear elementos recibidos (invitaciones para mí + solicitudes para mis fincas)
      const mappedReceived: FarmRequest[] = [
        ...invReceived.map((i: any) => ({
          id: i.id,
          type: 'INVITE' as const,
          farm_id: i.finca_id || i.farm_id,
          farm_name: i.finca_name || i.farm_name || 'Finca',
          user_id: i.user_id,
          user_name: i.invited_by_name || i.user_name || 'Administrador',
          message: i.message,
          status: String(i.status || 'pending').toLowerCase() as any,
          role: i.requested_role || i.role,
          created_at: i.created_at,
        })),
        ...memToApprove.map((r: any) => ({
          id: r.id,
          type: 'REQUEST' as const,
          farm_id: r.finca_id || r.farm_id,
          farm_name: r.finca_name || r.farm_name || 'Finca',
          user_id: r.user_id,
          user_name: r.user_name || 'Usuario solicitante',
          message: r.message,
          status: String(r.status || 'pending').toLowerCase() as any,
          role: r.requested_role || r.role,
          created_at: r.created_at,
        })),
      ];

      // Evitar duplicados por id
      const uniqueReceived = Array.from(
        new Map(mappedReceived.map((item) => [item.id, item])).values(),
      );

      const mappedSent: FarmRequest[] = invSent.map((s: any) => ({
        id: s.id,
        type: 'INVITE' as const,
        farm_id: s.finca_id || s.farm_id,
        farm_name: s.finca_name || s.farm_name || 'Finca',
        user_id: s.user_id,
        user_name: s.user_name || 'Usuario invitado',
        message: s.message,
        status: String(s.status || 'pending').toLowerCase() as any,
        role: s.requested_role || s.role,
        created_at: s.created_at,
      }));

      setReceived(uniqueReceived);
      setSent(mappedSent);
    } catch (error) {
      console.error('Error fetching farm requests', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const respondToInvitation = async (id: number, action: 'accept' | 'reject') => {
    try {
      const approve = action === 'accept';
      // Intentar primero por /invitations/:id/respond y como fallback por /membership/requests/:id/respond
      try {
        await apiClient.post(`/invitations/${id}/respond`, { action, approve });
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 404 || firstErr?.response?.status === 400) {
          await apiClient.post(`/membership/requests/${id}/respond`, { action, approve });
        } else {
          throw firstErr;
        }
      }

      await fetchRequests();
      if (action === 'accept') {
        refreshUserData?.();
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || 'Error al procesar respuesta' };
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const pendingCount = received.filter((r) => r.status === 'pending').length;

  return {
    received,
    sent,
    loading,
    refresh: fetchRequests,
    respondToInvitation,
    pendingCount,
  };
}
