import api from '@/shared/api/client';
import { ApiResponse } from '@/shared/api/generated/swaggerTypes';

export interface ChatMessage {
  id: number | string;
  finca_id: number;
  sender_id: number;
  sender_name: string;
  recipient_id: number;
  recipient_name: string;
  message: string;
  is_read: boolean;
  client_message_id?: string | null;
  read_at?: string | null;
  status?: 'pending' | 'delivered' | 'synced';
  attachment_url?: string | null;
  attachment_type?: 'image' | 'video' | 'file' | 'document' | 'audio' | string | null;
  attachment_name?: string | null;
  created_at: string;
}

export interface ChatContact {
  id: number;
  fullname: string;
  role: string;
  email: string;
  unread_count?: number;
}

export interface ChatUploadResponse {
  url: string;
  type: string;
  name: string;
  file_size?: number;
  extension?: string;
  mime_type?: string;
}

export const chatService = {
  /**
   * Obtener contactos disponibles para chatear
   */
  async getContacts() {
    const response = await api.get<ApiResponse<ChatContact[]>>('/chat/contacts', { skipCache: true } as never);
    return response.data;
  },

  /**
   * Obtener historial con un usuario (soporta paginación por cursor beforeId)
   */
  async getHistory(recipientId: number, beforeId?: number, limit = 30) {
    const params = new URLSearchParams();
    if (beforeId) params.append('before_id', String(beforeId));
    if (limit) params.append('limit', String(limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<ApiResponse<ChatMessage[]> & { meta?: { has_more?: boolean; oldest_id?: number } }>(
      `/chat/history/${recipientId}${qs}`,
      { skipCache: true } as never,
    );
    return response.data;
  },

  /**
   * Subir archivo multimedia o documento para chat
   */
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<ChatUploadResponse>>('/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Enviar mensaje con texto o adjunto
   */
  async sendMessage(
    recipientId: number,
    message: string,
    clientMessageId?: string,
    attachment?: { url?: string; type?: string; name?: string },
  ) {
    const response = await api.post<ApiResponse<ChatMessage>>('/chat/send', {
      recipient_id: recipientId,
      message,
      client_message_id: clientMessageId,
      attachment_url: attachment?.url,
      attachment_type: attachment?.type,
      attachment_name: attachment?.name,
    });
    return response.data;
  },

  /**
   * Obtener total de no leídos
   */
  async getUnreadCount() {
    const response = await api.get<ApiResponse<{ unread_count: number }>>('/chat/unread-count', { skipCache: true } as never);
    return response.data;
  },
};
