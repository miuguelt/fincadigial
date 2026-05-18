import { apiFetch } from '@/shared/api/apiFetch';

export type ChatMessage = {
  id: number;
  sender_id: number;
  recipient_id: number;
  message: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'file';
  attachment_name?: string;
  is_read: boolean;
  created_at: string;
};

export type ChatContact = {
  id: number;
  fullname: string;
  role: string;
  email: string;
};

export type UnreadCountResponse = {
  unread_count: number;
};

export const chatService = {
  /**
   * Obtener contador de mensajes no leídos
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiFetch<UnreadCountResponse>({
      url: '/chat/unread-count',
      method: 'GET',
    });
    return (response as any).unread_count ?? 0;
  },

  /**
   * Obtener lista de contactos disponibles para chat
   */
  async getContacts(): Promise<ChatContact[]> {
    const response = await apiFetch<ChatContact[]>({
      url: '/chat/contacts',
      method: 'GET',
    });
    return (response as any) ?? [];
  },

  /**
   * Obtener historial de mensajes con un usuario
   */
  async getHistory(recipientId: number, page = 1, perPage = 50): Promise<ChatMessage[]> {
    const response = await apiFetch<ChatMessage[]>({
      url: `/chat/history/${recipientId}?page=${page}&per_page=${perPage}`,
      method: 'GET',
    });
    return (response as any) ?? [];
  },

  /**
   * Enviar mensaje
   */
  async sendMessage(recipientId: number, message: string, attachment?: {
    url: string;
    type: 'image' | 'file';
    name: string;
  }): Promise<ChatMessage> {
    const response = await apiFetch<ChatMessage>({
      url: '/chat/send',
      method: 'POST',
      data: { 
        recipient_id: recipientId, 
        message,
        attachment_url: attachment?.url,
        attachment_type: attachment?.type,
        attachment_name: attachment?.name
      },
    });
    return response as any;
  },

  /**
   * Subir archivo para adjuntar en chat
   */
  async uploadFile(file: File): Promise<{ url: string; type: 'image' | 'file'; name: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiFetch<{ url: string; type: 'image' | 'file'; name: string }>({
      url: '/chat/upload',
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response as any;
  },
};
