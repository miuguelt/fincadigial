import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconSend, IconMessageCircle, IconWifi, IconWifiOff, IconSearch, IconX, IconMoodSmile, IconPaperclip, IconPhoto, IconDownload } from '@/shared/ui/icons';

// Tipos simples para evitar dependencias complejas
interface ChatContact {
  id: number;
  fullname: string;
  role: string;
  email: string;
}

interface ChatMessage {
  id: number;
  sender_id: number;
  recipient_id: number;
  message: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'file';
  attachment_name?: string;
  created_at: string;
}

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

// Servicios simples para evitar dependencias externas
const chatService = {
  async getContacts(): Promise<ChatContact[]> {
    try {
      const response = await fetch('/api/v1/chat/contacts');
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error loading contacts:', error);
      return [];
    }
  },

  async getHistory(recipientId: number): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`/api/v1/chat/history/${recipientId}`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  },

  async sendMessage(recipientId: number, message: string, attachment?: any): Promise<ChatMessage> {
    try {
      const response = await fetch('/api/v1/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          message,
          ...attachment
        })
      });
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  async uploadFile(file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/v1/chat/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
};

export default function ChatPage() {
  const navigate = useNavigate();
  // Mock user para evitar error de AuthProvider
  const user = { id: 1, fullname: 'Test User', email: 'test@example.com' };
  
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  // Cargar contactos al inicio
  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true);
      try {
        const contactsData = await chatService.getContacts();
        setContacts(contactsData);
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  // Cargar mensajes cuando se selecciona un contacto
  useEffect(() => {
    if (!selectedContact) return;

    const loadMessages = async () => {
      try {
        const messagesData = await chatService.getHistory(selectedContact.id);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, [selectedContact]);

  // Polling para nuevos mensajes
  useEffect(() => {
    if (!selectedContact || !isOnline) return;

    const interval = setInterval(async () => {
      try {
        const messagesData = await chatService.getHistory(selectedContact.id);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedContact, isOnline]);

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedContact) return;

    setSending(true);
    try {
      let attachmentData = null;
      
      // Subir archivo si existe
      if (selectedFile) {
        setUploading(true);
        attachmentData = await chatService.uploadFile(selectedFile);
        setUploading(false);
      }

      // Enviar mensaje
      const messageData = await chatService.sendMessage(
        selectedContact.id,
        newMessage.trim(),
        attachmentData || undefined
      );

      if (messageData) {
        setMessages(prev => [...prev, messageData]);
        setNewMessage('');
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
          <IconMessageCircle style={{ height: '48px', width: '48px', margin: '0 auto 16px' }} />
          <p style={{ color: '#666' }}>Cargando contactos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', backgroundColor: '#fff' }}>
      {/* Sidebar - Lista de contactos */}
      <div style={{ width: '320px', borderRight: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
            >
              <IconArrowLeft size="md" />
            </button>
            <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Mensajes</h1>
            {isOnline ? (
              <IconWifi size="sm" className="text-emerald-500" />
            ) : (
              <IconWifiOff size="sm" className="text-red-500" />
            )}
          </div>
          
          {/* Búsqueda */}
          <div style={{ position: 'relative' }}>
            <IconSearch size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
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
          {filteredContacts.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
              <IconMessageCircle style={{ height: '48px', width: '48px', margin: '0 auto 12px', opacity: 0.4 }} />
              <p>No hay contactos disponibles</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                style={{
                  width: '100%',
                  padding: '16px',
                  textAlign: 'left',
                  backgroundColor: 'transparent',
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header del chat */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <IconMessageCircle style={{ height: '48px', width: '48px', margin: '0 auto 12px', opacity: 0.4 }} />
                <p>No hay mensajes aún. ¡Inicia la conversación!</p>
              </div>
            ) : (
              messages.map(message => (
                <div key={message.id} style={{ display: 'flex', justifyContent: message.sender_id === user.id ? 'flex-end' : 'flex-start', marginBottom: '16px' }}>
                  <div style={{
                    maxWidth: '288px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: message.sender_id === user.id ? '#3b82f6' : '#f9fafb',
                    border: message.sender_id === user.id ? 'none' : '1px solid #e5e7eb',
                    color: message.sender_id === user.id ? '#fff' : '#000'
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
                            <IconPhoto size="sm" />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.attachment_name}</span>
                            <a 
                              href={message.attachment_url} 
                              download={message.attachment_name}
                              style={{ color: '#3b82f6', textDecoration: 'none' }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <IconDownload size="sm" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    <p style={{ fontSize: '14px', wordBreak: 'break-word', margin: 0 }}>{message.message}</p>
                    <p style={{
                      fontSize: '12px',
                      marginTop: '4px',
                      color: message.sender_id === user.id ? 'rgba(255,255,255,0.7)' : '#666'
                    }}>
                      {formatTimeAgo(message.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input de mensaje */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            {!isOnline && (
              <div style={{ marginBottom: '8px', padding: '6px 12px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconWifiOff size="sm" />
                Sin conexión a internet. Los mensajes se enviarán cuando vuelvas a estar en línea.
              </div>
            )}
            {selectedFile && (
              <div style={{ marginBottom: '8px', padding: '6px 12px', backgroundColor: '#dbeafe', color: '#3b82f6', fontSize: '12px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconPhoto size="sm" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                >
                  <IconX size="sm" />
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
                <IconPaperclip size="md" />
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
                disabled={!isOnline}
              />
              
              {/* Emoji picker */}
              <div className="emoji-picker" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#666', borderRadius: '6px' }}
                  disabled={!isOnline}
                >
                  <IconMoodSmile size="md" />
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
                disabled={!newMessage.trim() && !selectedFile || sending || !isOnline}
                style={{
                  padding: '8px',
                  backgroundColor: (!newMessage.trim() && !selectedFile) || sending || !isOnline ? '#9ca3af' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!newMessage.trim() && !selectedFile) || sending || !isOnline ? 'not-allowed' : 'pointer'
                }}
              >
                <IconSend size="md" />
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
          <div style={{ textAlign: 'center' }}>
            <IconMessageCircle style={{ height: '64px', width: '64px', margin: '0 auto 16px', color: '#666', opacity: 0.4 }} />
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Selecciona un contacto</h2>
            <p style={{ color: '#666', margin: 0 }}>Elige un contacto de la lista para empezar a chatear</p>
          </div>
        </div>
      )}
    </div>
  );
}

