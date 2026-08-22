import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { openFloatingChat } from '@/features/chat/model/floatingChat';

/**
 * Compatibilidad con los enlaces antiguos `/chat` y `/admin/chat`.
 *
 * La pantalla completa de mensajes se retiró: el chat vive únicamente en la
 * ventana flotante. Este puente abre esa ventana —con la conversación indicada
 * en `?contactId=` si viene— y devuelve al usuario a su panel.
 */
export default function ChatRedirect() {
  const [searchParams] = useSearchParams();
  const contactId = Number(searchParams.get('contactId'));

  useEffect(() => {
    openFloatingChat(Number.isFinite(contactId) && contactId > 0 ? { id: contactId } : undefined);
  }, [contactId]);

  return <Navigate to="/dashboard" replace />;
}
