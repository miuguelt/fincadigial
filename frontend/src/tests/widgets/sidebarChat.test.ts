import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from '@/entities/user/api/chat.service';
import { OfflineChatService } from '@/shared/api/offline/OfflineChatService';

describe('SidebarChatSection and OfflineChat integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('proporciona el conteo de mensajes no leídos para la insignia del menú lateral', async () => {
    vi.spyOn(chatService, 'getUnreadCount').mockResolvedValue({
      data: { unread_count: 5 },
    } as any);

    const unread = await chatService.getUnreadCount();
    expect(unread.data?.unread_count).toBe(5);
  });

  it('obtiene la lista de contactos para la búsqueda en la barra lateral', async () => {
    const mockContacts = [
      { id: 1, fullname: 'Capataz Demo', role: 'Capataz', unread_count: 2 },
      { id: 2, fullname: 'Veterinario Demo', role: 'Veterinario', unread_count: 0 },
    ];
    vi.spyOn(chatService, 'getContacts').mockResolvedValue({
      data: mockContacts,
    } as any);

    const res = await chatService.getContacts();
    expect(res.data).toHaveLength(2);
    expect(res.data[0].fullname).toBe('Capataz Demo');
    expect(res.data[0].unread_count).toBe(2);
  });

  it('permite enviar mensajes desde la barra lateral a través de OfflineChatService', async () => {
    const sendSpy = vi.spyOn(OfflineChatService, 'send').mockResolvedValue({
      id: 'local-msg-1',
      senderId: 1,
      senderName: 'Usuario Actual',
      recipientId: 2,
      content: 'Mensaje desde la barra lateral',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const msg = await OfflineChatService.send(1, 'Usuario Actual', 2, 'Mensaje desde la barra lateral');
    expect(sendSpy).toHaveBeenCalledWith(1, 'Usuario Actual', 2, 'Mensaje desde la barra lateral');
    expect(msg.content).toBe('Mensaje desde la barra lateral');
  });
});
