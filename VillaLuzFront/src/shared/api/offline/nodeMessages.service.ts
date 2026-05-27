import api from '@/shared/api/client';

export interface NodeMessagePayload {
  content: string;
  message_type?: 'chat' | 'alert' | 'system';
  sender_device_id?: string;
  recipient_user_id?: number;
  recipient_node_id?: string;
  priority?: number;
  finca_id?: number;
}

export const nodeMessagesService = {
  async list(params?: { node_id?: string; limit?: number; finca_id?: number }) {
    const { data } = await api.get('/node-messages', { params });
    return data?.data || data;
  },

  async send(payload: NodeMessagePayload) {
    const { data } = await api.post('/node-messages', payload);
    return data?.data || data;
  },
};

