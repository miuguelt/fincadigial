import { useEffect, useState } from 'react';

/**
 * ¿Está el dispositivo sin red ahora mismo?
 *
 * Se lee de forma perezosa para que el primer render ya sepa la respuesta: en
 * campo la pantalla suele abrirse ya sin cobertura, y un parpadeo de "en línea"
 * a "sin conexión" hace dudar de lo que se está viendo.
 */
export function useOfflineFlag(): boolean {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}
