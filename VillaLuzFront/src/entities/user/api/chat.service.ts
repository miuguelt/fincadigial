import api from '@/shared/api/client';
import { ApiResponse } from '@/shared/api/generated/swaggerTypes';

export interface ChatMessage {
  id: number;
  finca_id: number;
  sender_id: number;
  sender_name: string;
  recipient_id: number;
  recipient_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatContact {
  id: number;
  fullname: string;
  role: string;
  email: string;
  unread_count?: number;
}

export const chatService = {
  /**
   * Obtener contactos disponibles para chatear
   */
  async getContacts() {
    const response = await api.get<ApiResponse<ChatContact[]>>('/chat/contacts');
    return response.data;
  },

  /**
   * Obtener historial con un usuario
   */
  async getHistory(recipientId: number) {
    const response = await api.get<ApiResponse<ChatMessage[]>>(`/chat/history/${recipientId}`);
    return response.data;
  },

  /**
   * Enviar mensaje
   */
  async sendMessage(recipientId: number, message: string) {
    const response = await api.post<ApiResponse<ChatMessage>>('/chat/send', {
      recipient_id: recipientId,
      message
    });
    return response.data;
  },

  /**
   * Obtener total de no leídos
   */
  async getUnreadCount() {
    const response = await api.get<ApiResponse<{ unread_count: number }>>('/chat/unread-count');
    return response.data;
  }
};
