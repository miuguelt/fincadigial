import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, Wifi, WifiOff, Search, X, Smile, Paperclip, FileImage, Download, Server, CheckCircle2, RefreshCw, Clock3, Check, CheckCheck } from 'lucide-react';
import api from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/useAuth';
import { OfflineChatService, type ChatMessage as OfflineChatMessage } from '@/shared/api/offline/OfflineChatService';
import { FieldNodeService, type FieldNodeProbe } from '@/shared/api/offline/FieldNodeService';
import './ChatPage.css';

// Tipos simples para evitar dependencias complejas
interface ChatContact {
  id: number;
  fullname: string;
  role: string;
  email: string;
}

interface ChatMessage {
  id: number | string;
  sender_id: number;
  recipient_id: number;
  message: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'file';
  attachment_name?: string;
  created_at: string;
  status?: OfflineChatMessage['status'];
}

const toPageMessage = (message: OfflineChatMessage): ChatMessage => ({
  id: message.id,
  sender_id: message.senderId,
  recipient_id: message.recipientId,
  message: message.content,
  attachment_url: message.attachmentUrl,
  attachment_type: message.attachmentType,
  attachment_name: message.attachmentName,
  created_at: message.createdAt,
  status: message.status,
});

const CONTACTS_CACHE_KEY = 'villaluz.chat.contacts';
const contactsCacheKey = (userId?: number) =>
  Number.isFinite(userId) ? `${CONTACTS_CACHE_KEY}:${userId}` : CONTACTS_CACHE_KEY;

const readCachedContacts = (userId?: number): ChatContact[] => {
  try {
    return JSON.parse(localStorage.getItem(contactsCacheKey(userId)) || '[]') as ChatContact[];
  } catch {
    return [];
  }
};

const writeCachedContacts = (contacts: ChatContact[], userId?: number) => {
  try { localStorage.setItem(contactsCacheKey(userId), JSON.stringify(contacts)); } catch { /* cache opcional */ }
};

// Función simple para formatear tiempo relativo
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'ahora';
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

// Servicios de chat — usan el cliente axios compartido (JWT automático)
const chatService = {
  async getContacts(userId?: number): Promise<ChatContact[]> {
    try {
      const { data } = await api.get<{ success: boolean; data: ChatContact[] }>('/chat/contacts');
      const contacts = data.data ?? [];
      writeCachedContacts(contacts, userId);
      return contacts;
    } catch {
      try {
        const data = await FieldNodeService.get<{ data?: ChatContact[] }>('/chat/contacts');
        const contacts = data.data ?? [];
        writeCachedContacts(contacts, userId);
        return contacts;
      } catch {
        const cached = readCachedContacts(userId);
        if (cached.length > 0) return cached;
        throw new Error('CONTACTS_UNAVAILABLE');
      }
    }
  },

  async getHistory(recipientId: number, senderId?: number): Promise<ChatMessage[]> {
    const history = await OfflineChatService.loadHistory(recipientId, senderId);
    return history.map(toPageMessage);
  },

  async sendMessage(recipientId: number, message: string, attachment?: Record<string, unknown>): Promise<ChatMessage> {
    const { data } = await api.post<{ success: boolean; data: ChatMessage }>('/chat/send', {
      recipient_id: recipientId,
      message,
      client_message_id: globalThis.crypto?.randomUUID?.()
        ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...attachment,
    });
    return data.data;
  },

  async uploadFile(file: File): Promise<{ url: string; name: string; type: 'image' | 'file' }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ success: boolean; data: { url: string; name: string; type: 'image' | 'file' } }>(
      '/chat/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
  },
};

export default function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [, setUploading] = useState(false);
  const [showNodeSettings, setShowNodeSettings] = useState(false);
  const [nodeUrl, setNodeUrl] = useState(() => FieldNodeService.getUrl());
  const [nodeProbe, setNodeProbe] = useState<FieldNodeProbe>({
    status: FieldNodeService.getUrl() ? 'checking' : 'disabled',
    url: FieldNodeService.getUrl(),
  });

  // Emojis comunes para el picker
  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '✅', '⚠️', '❓', '👋', '🙏', '👏', '💪'];

  // Filtrar contactos por búsqueda
  const filteredContacts = contacts.filter(contact =>
    contact.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Monitorear estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    FieldNodeService.probe().then((probe) => { if (active) setNodeProbe(probe); });
    const unsubscribe = FieldNodeService.subscribe(() => {
      const value = FieldNodeService.getUrl();
      setNodeUrl(value);
      setNodeProbe({ status: value ? 'checking' : 'disabled', url: value });
      FieldNodeService.probe().then((probe) => { if (active) setNodeProbe(probe); });
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  // Cargar contactos al inicio
  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true);
      setContactsError(null);
      try {
        const contactsData = await chatService.getContacts(Number(user?.id));
        setContacts(contactsData);
      } catch {
        setContactsError('No se pudieron cargar los contactos. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [user?.id]);

  // Permitir abrir el chat directamente sobre la persona elegida desde usuarios.
  useEffect(() => {
    const contactId = Number(searchParams.get('contactId'));
    if (!contactId || selectedContact || contacts.length === 0) return;
    const contact = contacts.find((item) => item.id === contactId);
    if (contact) setSelectedContact(contact);
  }, [contacts, searchParams, selectedContact]);

  // Cargar mensajes cuando se selecciona un contacto
  useEffect(() => {
    if (!selectedContact) return;

    const loadMessages = async () => {
      try {
        const messagesData = await chatService.getHistory(selectedContact.id, Number(user?.id));
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, [selectedContact, user?.id]);

  // Si llega un mensaje de la conversación abierta, el historial se consulta
  // inmediatamente para marcarlo como leído y emitir el recibo al remitente.
  useEffect(() => {
    if (!selectedContact) return;
    const onRealtime = () => {
      void chatService.getHistory(selectedContact.id, Number(user?.id))
        .then(setMessages)
        .catch(() => undefined);
    };
    window.addEventListener('chat-realtime-updated', onRealtime);
    return () => window.removeEventListener('chat-realtime-updated', onRealtime);
  }, [selectedContact, user?.id]);

  useEffect(() => {
    if (!selectedContact) return;
    return OfflineChatService.subscribe(() => {
      const currentUserId = Number(user?.id);
      const conversation = OfflineChatService.getConversation(
        selectedContact.id,
        Number.isFinite(currentUserId) ? currentUserId : undefined,
      );
      setMessages(conversation.map(toPageMessage));
    });
  }, [selectedContact, user?.id]);

  // Polling ligero para nuevos mensajes; no consume datos cuando la pestaña
  // está en segundo plano o la finca perdió señal.
  useEffect(() => {
    if (!selectedContact) return;

    const interval = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const messagesData = await chatService.getHistory(selectedContact.id, Number(user?.id));
        setMessages(messagesData);
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedContact, isOnline, user?.id]);

  // Cerrar emoji picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.emoji-picker')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveAndProbeNode = async () => {
    try {
      const normalized = FieldNodeService.setUrl(nodeUrl);
      setNodeUrl(normalized);
      setNodeProbe({ status: normalized ? 'checking' : 'disabled', url: normalized });
      const probe = await FieldNodeService.probe();
      setNodeProbe(probe);
      if (probe.status === 'available') {
        const contactsData = await chatService.getContacts(Number(user?.id));
        setContacts(contactsData);
        await OfflineChatService.flushPending();
      }
    } catch {
      setNodeProbe({ status: 'unavailable', url: nodeUrl });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedContact) return;

    setSending(true);
    const textOnly = !selectedFile;
    try {
      let attachmentData = null;

      // Subir archivo si existe
      if (selectedFile) {
        setUploading(true);
        attachmentData = await chatService.uploadFile(selectedFile);
        setUploading(false);
      }

      // Text messages use the offline outbox; attachments still require a
      // connection because the binary upload cannot be queued safely here.
      const messageData = textOnly
        ? await (async () => {
          const senderId = Number(user?.id);
          if (!Number.isFinite(senderId)) throw new Error('AUTH_USER_REQUIRED');
          return OfflineChatService.send(
            senderId,
            String((user as { fullname?: string; name?: string } | null)?.fullname ||
              (user as { fullname?: string; name?: string } | null)?.name || 'Usuario'),
            selectedContact.id,
            newMessage.trim(),
          ).then(toPageMessage)
        })()
        : await chatService.sendMessage(
          selectedContact.id,
          newMessage.trim() || attachmentData?.name || 'Archivo adjunto',
          attachmentData || undefined,
        );

      if (messageData) {
        if (!textOnly) setMessages(prev => [...prev, messageData]);
        setNewMessage('');
        setSelectedFile(null);
      }
    } catch (error) {
      if (textOnly && selectedContact) {
        const currentUserId = Number(user?.id);
        const pending = OfflineChatService.getConversation(
          selectedContact.id,
          Number.isFinite(currentUserId) ? currentUserId : undefined,
        );
        setMessages(pending.map(toPageMessage));
        setNewMessage('');
      } else {
        console.error('Error sending message:', error);
      }
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  if (loading) {
    return (
      <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <MessageCircle style={{ height: '48px', width: '48px', margin: '0 auto 16px' }} />
          <p style={{ color: '#666' }}>Cargando contactos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page-shell" style={{ height: 'calc(100vh - 4rem)', display: 'flex', backgroundColor: '#fff' }}>
      {/* Sidebar - Lista de contactos */}
      <div className={`chat-sidebar ${selectedContact ? 'chat-sidebar--conversation-open' : ''}`} style={{ width: '320px', borderRight: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
            >
              <ArrowLeft style={{ height: '20px', width: '20px' }} />
            </button>
            <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Mensajes</h1>
            {isOnline ? (
              <Wifi style={{ height: '16px', width: '16px', color: '#10b981' }} />
            ) : (
              <WifiOff style={{ height: '16px', width: '16px', color: '#ef4444' }} />
            )}
            <button
              type="button"
              onClick={() => setShowNodeSettings((value) => !value)}
              className={`chat-node-button chat-node-button--${nodeProbe.status}`}
              aria-label="Configurar nodo de finca"
              title="Configurar nodo de finca"
            >
              <Server style={{ height: '17px', width: '17px' }} />
              <span>{nodeProbe.status === 'available' ? 'Nodo listo' : 'Nodo'}</span>
            </button>
          </div>
          {showNodeSettings && (
            <div className="chat-node-panel">
              <div className="chat-node-title">
                <Server size={18} />
                <div>
                  <strong>Nodo local de la finca</strong>
                  <p>Conecta los equipos por el Wi-Fi o hotspot local, aunque no haya internet.</p>
                </div>
              </div>
              <label htmlFor="field-node-url">Dirección del nodo</label>
              <div className="chat-node-form">
                <input
                  id="field-node-url"
                  value={nodeUrl}
                  onChange={(event) => setNodeUrl(event.target.value)}
                  placeholder="192.168.1.20:5000"
                  inputMode="url"
                />
                <button type="button" onClick={saveAndProbeNode} disabled={nodeProbe.status === 'checking'}>
                  {nodeProbe.status === 'checking' ? <RefreshCw className="chat-spin" size={17} /> : 'Probar'}
                </button>
              </div>
              <p className={`chat-node-result chat-node-result--${nodeProbe.status}`}>
                {nodeProbe.status === 'available' && <><CheckCircle2 size={15} /> Nodo disponible{nodeProbe.latencyMs ? ` · ${nodeProbe.latencyMs} ms` : ''}</>}
                {nodeProbe.status === 'unavailable' && <>No se pudo alcanzar el nodo. Verifica la misma red y la dirección.</>}
                {nodeProbe.status === 'disabled' && <>Opcional: los mensajes seguirán guardándose en este equipo.</>}
              </p>
            </div>
          )}

          {/* Búsqueda */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', height: '16px', width: '16px', color: '#666' }} />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '16px',
                padding: '8px 16px 8px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Lista de contactos */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {contactsError ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>
              <MessageCircle style={{ height: '48px', width: '48px', margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ marginBottom: '12px' }}>{contactsError}</p>
              <button
                type="button"
                onClick={() => { setContactsError(null); setLoading(true); chatService.getContacts(Number(user?.id)).then(setContacts).catch(() => setContactsError('Error al cargar contactos.')).finally(() => setLoading(false)); }}
                style={{ padding: '6px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
              >
                Reintentar
              </button>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
              <MessageCircle style={{ height: '48px', width: '48px', margin: '0 auto 12px', opacity: 0.4 }} />
              <p>No hay otros usuarios en tu finca</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <button
                key={contact.id}
                type="button"
                onClick={() => setSelectedContact(contact)}
                style={{
                  width: '100%',
                  padding: '16px',
                  textAlign: 'left',
                  border: 'none',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  borderLeft: selectedContact?.id === contact.id ? '4px solid #3b82f6' : '4px solid transparent',
                  backgroundColor: selectedContact?.id === contact.id ? '#dbeafe' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ height: '40px', width: '40px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#3b82f6' }}>
                      {contact.fullname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '500', fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.fullname}</p>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0, textTransform: 'capitalize' }}>{contact.role}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de chat */}
      {selectedContact ? (
        <div className="chat-conversation" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header del chat */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button type="button" className="chat-mobile-back" onClick={() => setSelectedContact(null)} aria-label="Volver a contactos">
                <ArrowLeft size={20} />
              </button>
              <div style={{ height: '40px', width: '40px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#3b82f6' }}>
                  {selectedContact.fullname.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p style={{ fontWeight: '500', margin: 0 }}>{selectedContact.fullname}</p>
                <p style={{ fontSize: '12px', color: '#666', margin: 0, textTransform: 'capitalize' }}>{selectedContact.role}</p>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', marginTop: '32px' }}>
                <MessageCircle style={{ height: '48px', width: '48px', margin: '0 auto 12px', opacity: 0.4 }} />
                <p>No hay mensajes aún. ¡Inicia la conversación!</p>
              </div>
            ) : (
              messages.map(message => (
                <div key={message.id} style={{ display: 'flex', justifyContent: Number(message.sender_id) === Number(user?.id) ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                  <div style={{
                    maxWidth: '288px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: Number(message.sender_id) === Number(user?.id) ? '#3b82f6' : '#f9fafb',
                    border: Number(message.sender_id) === Number(user?.id) ? 'none' : '1px solid #e5e7eb',
                    color: Number(message.sender_id) === Number(user?.id) ? '#fff' : '#000'
                  }}>
                    {message.attachment_url && (
                      <div style={{ marginBottom: '8px' }}>
                        {message.attachment_type === 'image' ? (
                          <img
                            src={message.attachment_url}
                            alt={message.attachment_name}
                            style={{ borderRadius: '4px', maxWidth: '100%', height: 'auto' }}
                            loading="lazy"
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                            <FileImage style={{ height: '16px', width: '16px' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.attachment_name}</span>
                            <a
                              href={message.attachment_url}
                              download={message.attachment_name}
                              style={{ color: '#3b82f6', textDecoration: 'none' }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download style={{ height: '16px', width: '16px' }} />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    <p style={{ fontSize: '14px', overflowWrap: 'break-word', margin: 0 }}>{message.message}</p>
                    <p style={{
                      fontSize: '12px',
                      marginTop: '4px',
                      color: Number(message.sender_id) === Number(user?.id) ? 'rgba(255,255,255,0.7)' : '#666'
                    }}>
                      {formatTimeAgo(message.created_at)}
                      {Number(message.sender_id) === Number(user?.id) && message.status === 'pending' && <Clock3 size={12} aria-label="Pendiente" style={{ display: 'inline', marginLeft: 4 }} />}
                      {Number(message.sender_id) === Number(user?.id) && message.status === 'delivered' && <Check size={12} aria-label="Entregado" style={{ display: 'inline', marginLeft: 4 }} />}
                      {Number(message.sender_id) === Number(user?.id) && message.status === 'synced' && <CheckCheck size={12} aria-label="Leído" style={{ display: 'inline', marginLeft: 4 }} />}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input de mensaje */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            {!isOnline && (
              <div style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: nodeProbe.status === 'available' ? '#d1fae5' : '#fef3c7', color: nodeProbe.status === 'available' ? '#065f46' : '#78350f', fontSize: '12px', fontWeight: 700, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WifiOff style={{ height: '12px', width: '12px' }} />
                {nodeProbe.status === 'available'
                  ? 'Sin internet · enviando por el nodo local de la finca.'
                  : 'Sin internet ni nodo local · el mensaje quedará pendiente en este equipo.'}
              </div>
            )}
            {selectedFile && (
              <div style={{ marginBottom: '8px', padding: '6px 12px', backgroundColor: '#dbeafe', color: '#3b82f6', fontSize: '12px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileImage style={{ height: '16px', width: '16px' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                >
                  <X style={{ height: '16px', width: '16px' }} />
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Botón de archivo */}
              <button
                type="button"
                onClick={() => document.getElementById('file-input')?.click()}
                style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#666', borderRadius: '6px' }}
                disabled={!isOnline}
              >
                <Paperclip style={{ height: '20px', width: '20px' }} />
              </button>

              {/* Input de mensaje */}
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                disabled={false}
              />

              {/* Emoji picker */}
              <div className="emoji-picker" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#666', borderRadius: '6px' }}
                  disabled={false}
                >
                  <Smile style={{ height: '20px', width: '20px' }} />
                </button>

                {showEmojiPicker && (
                  <div style={{
                    position: 'absolute',
                    bottom: '48px',
                    right: '0',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    padding: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '4px'
                  }}>
                    {commonEmojis.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '18px' }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón de enviar */}
              <button
                type="submit"
                disabled={!newMessage.trim() && !selectedFile || sending}
                style={{
                  padding: '8px',
                  backgroundColor: (!newMessage.trim() && !selectedFile) || sending ? '#9ca3af' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!newMessage.trim() && !selectedFile) || sending ? 'not-allowed' : 'pointer'
                }}
              >
                <Send style={{ height: '20px', width: '20px' }} />
              </button>
            </div>

            <input
              id="file-input"
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            />
          </form>
        </div>
      ) : (
        /* Vista vacía */
        <div className="chat-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
          <div style={{ textAlign: 'center' }}>
            <MessageCircle style={{ height: '64px', width: '64px', margin: '0 auto 16px', color: '#666', opacity: 0.4 }} />
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Selecciona un contacto</h2>
            <p style={{ color: '#666', margin: 0 }}>Elige un contacto de la lista para empezar a chatear</p>
          </div>
        </div>
      )}
    </div>
  );
}
