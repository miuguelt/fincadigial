/**
 * OfflineChatService — chat 1:1 con lectura local y envío tolerante a cortes.
 *
 * Fuente de verdad: la API `/chat` (tabla chat_messages). Lo local es sólo
 * caché de lectura y buffer de salida: cuando no hay red, el mensaje queda en
 * `pending` y se reintenta al volver online. No se fabrica ningún mensaje.
 */
import api from '@/shared/api/client';

export interface ChatMessage {
  id: number | string;
  senderId: number;
  senderName?: string;
  recipientId: number;
  content: string;
  createdAt: string;
  /** pending: sólo en el buffer local · delivered: en servidor sin leer · synced: leído. */
  status: 'pending' | 'delivered' | 'synced';
}

/** Forma cruda devuelta por la API `/chat`. */
interface ApiChatMessage {
  id: number;
  sender_id: number;
  sender_name?: string;
  recipient_id: number;
  message: string;
  created_at: string;
  is_read?: boolean;
}

function fromApi(raw: ApiChatMessage): ChatMessage {
  return {
    id: raw.id,
    senderId: raw.sender_id,
    senderName: raw.sender_name,
    recipientId: raw.recipient_id,
    content: raw.message,
    createdAt: raw.created_at,
    status: raw.is_read ? 'synced' : 'delivered',
  };
}

const STORAGE_KEY = 'villaluz.chat.outbox';

type Listener = (messages: ChatMessage[]) => void;

function readOutbox(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    /* almacenamiento lleno o no disponible: el envío sigue intentándose en memoria */
  }
}

class OfflineChatServiceImpl {
  private listeners = new Set<Listener>();
  private messages: ChatMessage[] = readOutbox();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.messages);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    writeOutbox(this.messages.filter((m) => m.status === 'pending'));
    for (const listener of this.listeners) listener(this.messages);
  }

  /** Carga el historial con un usuario desde el servidor. */
  async loadHistory(recipientId: number): Promise<ChatMessage[]> {
    const response = await api.get<{ data: ApiChatMessage[] }>(`/chat/history/${recipientId}`);
    const history = (response.data?.data ?? []).map(fromApi);
    const pending = this.messages.filter((m) => m.status === 'pending');
    this.messages = [...history, ...pending];
    this.emit();
    return history;
  }

  /**
   * Envía un mensaje. Si la petición falla lo conserva como `pending` para
   * reintentarlo con flushPending().
   */
  async send(
    senderId: number,
    senderName: string,
    recipientId: number,
    text: string,
  ): Promise<ChatMessage> {
    const optimistic: ChatMessage = {
      id: `local-${senderId}-${recipientId}-${this.messages.length}`,
      senderId,
      senderName,
      recipientId,
      content: text,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    this.messages = [...this.messages, optimistic];
    this.emit();

    try {
      const response = await api.post<{ data: ApiChatMessage }>('/chat/send', {
        recipient_id: recipientId,
        message: text,
      });
      const raw = response.data?.data;
      const saved: ChatMessage = raw ? fromApi(raw) : { ...optimistic, status: 'delivered' };
      this.messages = this.messages.map((m) => (m.id === optimistic.id ? saved : m));
      this.emit();
      return saved;
    } catch (error) {
      this.emit();
      throw error;
    }
  }

  /** Reintenta los mensajes que quedaron en el buffer local. */
  async flushPending(): Promise<void> {
    const pending = this.messages.filter((m) => m.status === 'pending');
    for (const message of pending) {
      try {
        const response = await api.post<{ data: ApiChatMessage }>('/chat/send', {
          recipient_id: message.recipientId,
          message: message.content,
        });
        const raw = response.data?.data;
        this.messages = this.messages.map((m) =>
          m.id === message.id ? (raw ? fromApi(raw) : { ...m, status: 'delivered' as const }) : m,
        );
      } catch {
        break; // sigue sin red: conservar el resto para el próximo intento
      }
    }
    this.emit();
  }

  /** El backend marca como leídos al servir el historial. */
  async markAsRead(_userId: number, recipientId: number): Promise<void> {
    await this.loadHistory(recipientId);
  }

  /**
   * Reintenta la salida pendiente y devuelve cuántos mensajes nuevos hay en el
   * servidor para este usuario. Se llama al recuperar conectividad.
   */
  async pullFromServer(): Promise<number> {
    await this.flushPending();
    try {
      const response = await api.get<{ data: { unread_count?: number } }>('/chat/unread-count');
      return response.data?.data?.unread_count ?? 0;
    } catch {
      return 0;
    }
  }

  /** Mensajes sin leer según el servidor; 0 si no hay red. */
  async getUnreadCount(_userId: number): Promise<number> {
    try {
      const response = await api.get<{ data: { unread_count?: number } }>('/chat/unread-count');
      return response.data?.data?.unread_count ?? 0;
    } catch {
      return 0;
    }
  }
}

export const OfflineChatService = new OfflineChatServiceImpl();
export default OfflineChatService;
