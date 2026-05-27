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
      // Intentamos cargar de ambos tipos (invitaciones recibidas y solicitudes enviadas)
      const [resInv, resReq] = await Promise.all([
        apiClient.get('/api/v1/invitations/me/invitations'),
        apiClient.get('/api/v1/invitations/me/join-requests').catch(() => ({ data: { data: [] } })),
      ]);

      setReceived((resInv.data?.data || []).map((i: any) => ({
        id: i.id,
        type: 'INVITE',
        farm_id: i.farm_id,
        farm_name: i.farm_name,
        user_name: i.invited_by_name,
        message: i.message,
        status: i.status.toLowerCase(),
        role: i.role,
        created_at: i.created_at
      })));

      setSent((resReq.data?.data || []).map((r: any) => ({
        id: r.id,
        type: 'REQUEST',
        farm_id: r.farm_id,
        farm_name: r.farm_name,
        user_name: r.user_name,
        message: r.message,
        status: r.status.toLowerCase(),
        created_at: r.created_at
      })));
    } catch (error) {
      console.error('Error fetching farm requests', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const respondToInvitation = async (id: number, action: 'accept' | 'reject') => {
    try {
      await apiClient.patch(`/api/v1/invitations/invitations/${id}`, { action });
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

  return {
    received,
    sent,
    loading,
    refresh: fetchRequests,
    respondToInvitation,
    pendingCount: received.length
  };
}
