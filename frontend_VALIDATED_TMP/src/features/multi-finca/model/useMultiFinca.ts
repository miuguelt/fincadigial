import { useState } from 'react';
import { apiClient } from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastContext';

export const useMultiFinca = () => {
  const { refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [switching, setSwitching] = useState(false);

  const switchFinca = async (fincaId: number) => {
    setSwitching(true);
    try {
      await apiClient.post(`/api/v1/multi-finca/switch`, { finca_id: fincaId });
      
      // Actualizar datos del usuario (refresca claims del JWT)
      await refreshUserData();
      
      showToast('Cambiando de finca...', 'info');
      
      // Redirigir y recargar para limpiar estados antiguos
      navigate('/dashboard', { replace: true });
      window.location.reload();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Error al cambiar de finca', 'error');
    } finally {
      setSwitching(false);
    }
  };

  return {
    switchFinca,
    switching
  };
};
