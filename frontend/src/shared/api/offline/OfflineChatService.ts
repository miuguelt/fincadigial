/**
 * OfflineChatService — chat 1:1 con lectura local y envío tolerante a cortes.
 *
 * Fuente de verdad: la API `/chat` (tabla chat_messages). Lo local es sólo
 * caché de lectura y buffer de salida: cuando no hay red, el mensaje queda en
 * `pending` y se reintenta al volver online. No se fabrica ningún mensaje.
 */
import api from '@/shared/api/client';
import { FieldNodeService } from './FieldNodeService';

export interface ChatMessage {
  id: number | string;
  senderId: number;
  senderName?: string;
  recipientId: number;
  content: string;
  createdAt: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file';
  attachmentName?: string;
  clientMessageId?: string;
  readAt?: string;
  /** pending: sólo en el buffer local · delivered: en servidor sin leer · synced: leído. */
  status: 'pending' | 'delivered' | 'synced';
}

/** Forma cruda devuelta por la API `/chat`. */
export interface ApiChatMessage {
  id: number;
  sender_id: number;
  sender_name?: string;
  recipient_id: number;
  message: string;
  created_at: string;
  is_read?: boolean;
  client_message_id?: string | null;
  read_at?: string | null;
  attachment_url?: string;
  attachment_type?: 'image' | 'file';
  attachment_name?: string;
}

function fromApi(raw: ApiChatMessage): ChatMessage {
  return {
    id: raw.id,
    senderId: raw.sender_id,
    senderName: raw.sender_name,
    recipientId: raw.recipient_id,
    content: raw.message,
    createdAt: raw.created_at,
    attachmentUrl: raw.attachment_url,
    attachmentType: raw.attachment_type,
    attachmentName: raw.attachment_name,
    clientMessageId: raw.client_message_id ?? undefined,
    readAt: raw.read_at ?? undefined,
    status: raw.is_read ? 'synced' : 'delivered',
  };
}

const STORAGE_KEY = 'villaluz.chat.outbox';
const CACHE_KEY = 'villaluz.chat.cache';

const storageKey = (base: string, userId: number | null) =>
  userId === null ? base : `${base}:${userId}`;

type Listener = (messages: ChatMessage[]) => void;

function readOutbox(userId: number | null): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(STORAGE_KEY, userId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(messages: ChatMessage[], userId: number | null): void {
  try {
    localStorage.setItem(storageKey(STORAGE_KEY, userId), JSON.stringify(messages));
  } catch {
    /* almacenamiento lleno o no disponible: el envío sigue intentándose en memoria */
  }
}

function readCache(userId: number | null): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(CACHE_KEY, userId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function mergeMessages(...groups: ChatMessage[][]): ChatMessage[] {
  const merged = new Map<string, ChatMessage>();
  for (const message of groups.flat()) {
    const key = message.clientMessageId
      ? `client:${message.senderId}:${message.clientMessageId}`
      : `server:${message.id}`;
    const previous = merged.get(key);
    if (!previous || (previous.status === 'pending' && message.status !== 'pending')) {
      merged.set(key, message);
    }
  }
  return [...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function writeCache(messages: ChatMessage[], userId: number | null): void {
  try {
    // Text chat is deliberately bounded so it cannot exhaust storage on low-end phones.
    localStorage.setItem(storageKey(CACHE_KEY, userId), JSON.stringify(messages.slice(-500)));
  } catch {
    /* Cache is an optimization; the pending outbox remains the durable priority. */
  }
}

class OfflineChatServiceImpl {
  private listeners = new Set<Listener>();
  private currentUserId: number | null = null;
  private messages: ChatMessage[] = mergeMessages(readCache(null), readOutbox(null));

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.messages);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    writeOutbox(this.messages.filter((m) => m.status === 'pending'), this.currentUserId);
    writeCache(this.messages, this.currentUserId);
    for (const listener of this.listeners) listener(this.messages);
  }

  setCurrentUser(userId: number | null): void {
    const normalized = userId !== null && Number.isFinite(userId) ? userId : null;
    if (this.currentUserId === normalized) return;
    this.currentUserId = normalized;
    this.messages = mergeMessages(readCache(normalized), readOutbox(normalized));
    for (const listener of this.listeners) listener(this.messages);
  }

  /**
   * Vacía el buffer en memoria y relee el outbox persistido.
   * Se usa al cerrar sesión, para que el siguiente usuario no herede mensajes
   * del anterior, y entre casos de prueba.
   */
  reset(): void {
    this.currentUserId = null;
    this.messages = mergeMessages(readCache(null), readOutbox(null));
    this.emit();
  }

  receiveFromServer(raw: ApiChatMessage): ChatMessage {
    const message = fromApi(raw);
    this.messages = mergeMessages(this.messages, [message]);
    this.emit();
    return message;
  }

  markMessagesRead(messageIds: number[]): void {
    const ids = new Set(messageIds.map(String));
    this.messages = this.messages.map((message) =>
      ids.has(String(message.id))
        ? { ...message, status: 'synced', readAt: message.readAt ?? new Date().toISOString() }
        : message,
    );
    this.emit();
  }

  getConversation(recipientId: number, senderId?: number): ChatMessage[] {
    if (senderId === undefined) {
      return this.messages.filter((message) =>
        message.recipientId === recipientId || message.senderId === recipientId,
      );
    }
    return this.messages.filter((message) =>
      (message.senderId === senderId && message.recipientId === recipientId) ||
      (message.senderId === recipientId && message.recipientId === senderId),
    );
  }

  /** Carga el historial con un usuario desde el servidor. */
  async loadHistory(recipientId: number, senderId?: number): Promise<ChatMessage[]> {
    if (senderId !== undefined) this.setCurrentUser(senderId);
    try {
      // Chat history must not use the generic GET cache: a cached empty result
      // can hide a message that was just confirmed by the server or field node.
      const response = await api.get<{ data: ApiChatMessage[] }>(
        `/chat/history/${recipientId}`,
        { skipCache: true } as never,
      );
      const history = (response.data?.data ?? []).map(fromApi);
      const pending = this.messages.filter(
        (message) => message.status === 'pending' && message.recipientId === recipientId,
      );
      this.messages = mergeMessages(this.messages, history, pending);
      this.emit();
      // The endpoint already scopes the result to this conversation. Returning
      // it directly avoids a transient auth-shape mismatch hiding valid rows.
      return mergeMessages(history, pending);
    } catch (primaryError) {
      try {
        const response = await FieldNodeService.get<{ data?: ApiChatMessage[] }>(`/chat/history/${recipientId}`);
        const history = (response.data ?? []).map(fromApi);
        this.messages = mergeMessages(this.messages, history);
        this.emit();
      } catch {
        // Local cache is the final fallback. The primary error is intentionally
        // swallowed so opening a conversation never crashes in the field.
        void primaryError;
      }
      return this.getConversation(recipientId, senderId);
    }
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
    this.setCurrentUser(senderId);
    const clientMessageId = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: ChatMessage = {
      id: `local-${clientMessageId}`,
      senderId,
      senderName,
      recipientId,
      content: text,
      createdAt: new Date().toISOString(),
      clientMessageId,
      status: 'pending',
    };
    this.messages = [...this.messages, optimistic];
    this.emit();

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('OFFLINE_MESSAGE_QUEUED');
      }
      const response = await api.post<{ data?: ApiChatMessage; __offlineQueued?: boolean }>('/chat/send', {
        recipient_id: recipientId,
        message: text,
        client_message_id: clientMessageId,
      }, { skipOffline: true } as never);
      if (response.status === 202 || response.data?.__offlineQueued) throw new Error('PRIMARY_MESSAGE_QUEUED');
      const raw = response.data?.data;
      const saved: ChatMessage = raw ? fromApi(raw) : { ...optimistic, status: 'delivered' };
      this.messages = this.messages.map((m) => (m.id === optimistic.id ? saved : m));
      this.emit();
      return saved;
    } catch (primaryError) {
      try {
        const response = await FieldNodeService.post<{ data?: ApiChatMessage }>('/chat/send', {
          recipient_id: recipientId,
          message: text,
          client_message_id: clientMessageId,
        });
        const saved = response.data ? fromApi(response.data) : { ...optimistic, status: 'delivered' as const };
        this.messages = this.messages.map((m) => (m.id === optimistic.id ? saved : m));
        this.emit();
        return saved;
      } catch {
        this.emit();
        throw primaryError;
      }
    }
  }

  /** Reintenta los mensajes que quedaron en el buffer local. */
  async flushPending(): Promise<void> {
    const pending = this.messages.filter((m) => m.status === 'pending');
    for (const message of pending) {
      try {
        let raw: ApiChatMessage | undefined;
        try {
          const response = await api.post<{ data?: ApiChatMessage; __offlineQueued?: boolean }>('/chat/send', {
            recipient_id: message.recipientId,
            message: message.content,
            client_message_id: message.clientMessageId,
          }, { skipOffline: true } as never);
          if (response.status === 202 || response.data?.__offlineQueued) throw new Error('PRIMARY_MESSAGE_QUEUED');
          raw = response.data?.data;
        } catch {
          const response = await FieldNodeService.post<{ data?: ApiChatMessage }>('/chat/send', {
            recipient_id: message.recipientId,
            message: message.content,
            client_message_id: message.clientMessageId,
          });
          raw = response.data;
        }
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
      const response = await api.get<{ data: { unread_count?: number } }>('/chat/unread-count', { skipCache: true } as never);
      return response.data?.data?.unread_count ?? 0;
    } catch {
      try {
        const response = await FieldNodeService.get<{ data?: { unread_count?: number } }>('/chat/unread-count');
        return response.data?.unread_count ?? 0;
      } catch {
        return 0;
      }
    }
  }

  /** Mensajes sin leer según el servidor; 0 si no hay red. */
  async getUnreadCount(_userId: number): Promise<number> {
    try {
      const response = await api.get<{ data: { unread_count?: number } }>('/chat/unread-count', { skipCache: true } as never);
      return response.data?.data?.unread_count ?? 0;
    } catch {
      return 0;
    }
  }
}

export const OfflineChatService = new OfflineChatServiceImpl();
export default OfflineChatService;
