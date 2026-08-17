import { useState } from 'react';
import { apiClient } from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastContext';
import { clearAllIndexedDBCache } from '@/shared/api/cache/indexedDBCache';

export const useMultiFinca = () => {
  const { refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [switching, setSwitching] = useState(false);

  const switchFinca = async (fincaId: number) => {
    setSwitching(true);
    try {
      const resp = await apiClient.post(`/api/v1/multi-finca/switch`, { finca_id: fincaId });

      // Persistir token de forma explícita si se recibió en la respuesta
      const token = resp.data?.data?.access_token || resp.data?.access_token;
      if (token) {
        localStorage.setItem('finca_access_token', token);
        sessionStorage.setItem('finca_access_token', token);
      }

      // Limpiar caché local offline para evitar datos residuales de la finca anterior
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('offline_cache_v2:')) {
            localStorage.removeItem(key);
            i--;
          }
        }
      } catch (e) {
        console.warn('No se pudo limpiar el caché offline:', e);
      }

      // Limpiar caché persistente de IndexedDB para evitar datos cruzados de la finca anterior
      try {
        await clearAllIndexedDBCache();
      } catch (e) {
        console.warn('No se pudo limpiar el caché persistente en IndexedDB:', e);
      }

      // Actualizar datos del usuario (refresca claims del JWT)
      await refreshUserData?.();

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
