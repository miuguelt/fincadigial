import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconSend, IconMessageCircle, IconWifi, IconWifiOff, IconSearch, IconX, IconMoodSmile, IconPaperclip, IconPhoto, IconDownload } from '@/shared/ui/icons';
import { chatService, ChatMessage, ChatContact } from '@/features/chat/api/chat.service';

// Función simple para formatear tiempo relativo
const formatTimeAgo = (date: Date): string => {
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

export default function ChatPageSimple() {
  const navigate = useNavigate();
  // Mock user para evitar error de AuthProvider en tests
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Scroll al final de mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cerrar emoji picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
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
        attachmentData = await chatService.uploadFile(selectedFile);
      }

      // Enviar mensaje
      const messageData = await chatService.sendMessage(
        selectedContact.id,
        newMessage.trim(),
        attachmentData || undefined
      );

      setMessages(prev => [...prev, messageData]);
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
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
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <IconMessageCircle className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-text-secondary">Cargando contactos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Sidebar - Lista de contactos */}
      <div className="w-80 border-r border-border bg-surface flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-state-hover rounded-lg transition-colors"
            >
              <IconArrowLeft size="md" />
            </button>
            <h1 className="text-xl font-semibold">Mensajes</h1>
            {isOnline ? (
              <IconWifi size="sm" className="text-green-500" />
            ) : (
              <IconWifiOff size="sm" className="text-red-500" />
            )}
          </div>
          
          {/* Búsqueda */}
          <div className="relative">
            <IconSearch size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Lista de contactos */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              <IconMessageCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No hay contactos disponibles</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-4 text-left hover:bg-state-hover transition-colors border-b border-border ${
                  selectedContact?.id === contact.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[var(--radius-full)] bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {contact.fullname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.fullname}</p>
                    <p className="text-xs text-text-secondary capitalize">{contact.role}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de chat */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col">
          {/* Header del chat */}
          <div className="p-4 border-b border-border bg-surface">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius-full)] bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {selectedContact.fullname.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{selectedContact.fullname}</p>
                <p className="text-xs text-text-secondary capitalize">{selectedContact.role}</p>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="text-center text-text-secondary mt-8">
                <IconMessageCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No hay mensajes aún. ¡Inicia la conversación!</p>
              </div>
            ) : (
              messages.map(message => (
                <div key={message.id} className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === user?.id 
                      ? 'bg-primary text-white' 
                      : 'bg-surface border border-border'
                  }`}>
                    {message.attachment_url && (
                      <div className="mb-2">
                        {message.attachment_type === 'image' ? (
                          <img 
                            src={message.attachment_url} 
                            alt={message.attachment_name}
                            className="rounded max-w-full h-auto"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-sm">
                            <IconPhoto size="sm" />
                            <span className="truncate">{message.attachment_name}</span>
                            <a 
                              href={message.attachment_url} 
                              download={message.attachment_name}
                              className="text-primary hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <IconDownload size="sm" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-sm break-words">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_id === user?.id ? 'text-white/70' : 'text-text-secondary'
                    }`}>
                      {formatTimeAgo(new Date(message.created_at))}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de mensaje */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-4 border-t border-border bg-surface">
            {!isOnline && (
              <div className="mb-2 px-3 py-2 bg-red-500/10 text-red-600 text-xs rounded-lg flex items-center gap-2">
                <IconWifiOff size="sm" />
                Sin conexión a internet. Los mensajes se enviarán cuando vuelvas a estar en línea.
              </div>
            )}
            {selectedFile && (
              <div className="mb-2 px-3 py-2 bg-primary/10 text-primary text-xs rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconPhoto size="sm" />
                  <span className="truncate">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-primary hover:text-primary/80"
                >
                  <IconX size="sm" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* Botón de archivo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-text-secondary hover:text-primary transition-colors"
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
                className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!isOnline}
              />
              
              {/* Emoji picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-text-secondary hover:text-primary transition-colors"
                  disabled={!isOnline}
                >
                  <IconMoodSmile size="md" />
                </button>
                
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-12 right-0 bg-surface border border-border rounded-lg shadow-[var(--shadow-token-md)] p-2 grid grid-cols-4 gap-1">
                    {commonEmojis.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="p-2 hover:bg-state-hover rounded text-lg"
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
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconSend size="md" />
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            />
          </form>
        </div>
      ) : (
        /* Vista vacía */
        <div className="flex-1 flex items-center justify-center bg-surface">
          <div className="text-center">
            <IconMessageCircle className="h-16 w-16 mx-auto mb-4 text-text-secondary opacity-40" />
            <h2 className="text-xl font-semibold mb-2">Selecciona un contacto</h2>
            <p className="text-text-secondary">Elige un contacto de la lista para empezar a chatear</p>
          </div>
        </div>
      )}
    </div>
  );
}

