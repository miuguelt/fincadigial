/**
 * Contrato único de la ventana flotante de chat.
 *
 * En la finca solo existe una superficie de conversación: el `ChatWidget`
 * flotante que monta `DashboardLayout`. Cualquier punto de entrada (menú del
 * encabezado, acciones rápidas, ficha de usuario, enlaces antiguos a `/chat`)
 * pide abrirla con este módulo en lugar de renderizar su propio panel; así no
 * se apilan dos conversaciones distintas sobre la misma pantalla.
 */

/** Evento global que escucha el `ChatWidget` para abrirse. */
export const OPEN_FLOATING_CHAT_EVENT = 'open-chat-modal';

/** Evento que emite el `ChatWidget` cada vez que cambia su estado visible. */
export const FLOATING_CHAT_STATE_EVENT = 'floating-chat-state';

export interface FloatingChatContact {
  id: number;
  fullname?: string;
  role?: string;
  unread_count?: number;
}

export interface FloatingChatState {
  open: boolean;
  contactId: number | null;
}

const state: FloatingChatState = { open: false, contactId: null };

/**
 * Petición que se emitió antes de que la ventana existiera —por ejemplo al
 * entrar directo por un enlace antiguo a `/chat`—. La ventana la consume al
 * montarse; si ya estaba montada, su manejador la vacía en el mismo instante.
 */
let pendingRequest: { contact?: FloatingChatContact } | null = null;

/**
 * Abre la ventana flotante. Con `contact` entra directo a esa conversación;
 * sin él, muestra la lista de compañeros.
 */
export function openFloatingChat(contact?: FloatingChatContact | null): void {
  const id = Number(contact?.id);
  const detail = Number.isFinite(id) && id > 0
    ? { contact: { ...contact, id } as FloatingChatContact }
    : {};

  pendingRequest = detail;
  window.dispatchEvent(new CustomEvent(OPEN_FLOATING_CHAT_EVENT, { detail }));
}

/** Solo la ventana flotante la llama: devuelve la petición pendiente y la borra. */
export function consumePendingFloatingChat(): { contact?: FloatingChatContact } | null {
  const pending = pendingRequest;
  pendingRequest = null;
  return pending;
}

/** Lo publica el `ChatWidget`; el resto de la app solo lo consulta. */
export function publishFloatingChatState(next: FloatingChatState): void {
  state.open = next.open;
  state.contactId = next.contactId;
  window.dispatchEvent(new CustomEvent(FLOATING_CHAT_STATE_EVENT, { detail: { ...state } }));
}

export function getFloatingChatState(): FloatingChatState {
  return { ...state };
}

/**
 * `true` cuando el usuario ya está leyendo esa conversación en pantalla: sirve
 * para no repetir con una notificación lo que acaba de ver llegar.
 */
export function isFloatingChatOpenWith(contactId: number): boolean {
  return state.open && state.contactId === Number(contactId);
}
