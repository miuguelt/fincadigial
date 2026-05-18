import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconSend, IconMessageCircle, IconWifi, IconWifiOff, IconSearch, IconX, IconMoodSmile, IconPaperclip, IconPhoto, IconDownload } from '@/shared/ui/icons';
import { chatService, ChatMessage, ChatContact } from '@/features/chat/api/chat.service';
import { useAuth } from '@/features/auth/model/useAuth';
// Función simple para formatear tiempo relativo (memoizada)
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

// Componente memoizado para item de contacto
const ContactItem = memo(({ 
  contact, 
  isSelected, 
  onClick 
}: { 
  contact: ChatContact; 
  isSelected: boolean; 
  onClick: () => void; 
}) => (
  <button
    onClick={onClick}
    className={`w-full p-4 text-left hover:bg-state-hover transition-colors border-b border-border ${
      isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : ''
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
));

ContactItem.displayName = 'ContactItem';

// Componente memoizado para mensaje
const MessageItem = memo(({ 
  message, 
  isOwn 
}: { 
  message: ChatMessage; 
  isOwn: boolean; 
}) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
      isOwn 
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
        isOwn ? 'text-white/70' : 'text-text-secondary'
      }`}>
        {formatTimeAgo(new Date(message.created_at))}
      </p>
    </div>
  </div>
));

MessageItem.displayName = 'MessageItem';

export default function ChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Emojis comunes para el picker (memoizado)
  const commonEmojis = useMemo(() => [
    '😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '✅', '⚠️', '❓', '👋', '🙏', '👏', '💪'
  ], []);

  // Filtrar contactos por búsqueda (memoizado)
  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.fullname.toLowerCase().includes(query) ||
      contact.role.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Callbacks optimizados
  const handleContactClick = useCallback((contact: ChatContact) => {
    setSelectedContact(contact);
    setShowEmojiPicker(false);
  }, []);

  const handleSendMessage = useCallback(async () => {
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
  }, [newMessage, selectedFile, selectedContact]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

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

  // Cargar contactos al inicio (memoizado)
  useEffect(() => {
    let isMounted = true;
    
    const loadContacts = async () => {
      setLoading(true);
      try {
        const contactsData = await chatService.getContacts();
        if (isMounted) {
          setContacts(contactsData);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContacts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cargar mensajes cuando se selecciona un contacto (memoizado)
  useEffect(() => {
    if (!selectedContact) return;
    let isMounted = true;

    const loadMessages = async () => {
      try {
        const messagesData = await chatService.getHistory(selectedContact.id);
        if (isMounted) {
          setMessages(messagesData);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedContact]);

  // Polling optimizado para nuevos mensajes
  useEffect(() => {
    if (!selectedContact || !isOnline) return;
    
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const messagesData = await chatService.getHistory(selectedContact.id);
        if (isMounted) {
          setMessages(messagesData);
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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
            <h1 className="text-lg font-semibold">Mensajes</h1>
          </div>
          {/* Búsqueda de contactos */}
          <div className="relative">
            <IconSearch size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contactos..."
              className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-state-hover rounded"
              >
                <IconX size="sm" className="text-text-secondary" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-text-secondary mt-2">
              {filteredContacts.length} resultado{filteredContacts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

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
      <div className="flex-1 flex flex-col bg-background">
        {selectedContact ? (
          <>
            {/* Header del chat */}
            <div className="p-4 border-b border-border bg-surface flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius-full)] bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {selectedContact.fullname.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{selectedContact.fullname}</p>
                <p className="text-xs text-text-secondary capitalize">{selectedContact.role}</p>
              </div>
              {/* Indicador de conexión */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-full)] text-xs ${isOnline ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                {isOnline ? <IconWifi size="sm" /> : <IconWifiOff size="sm" />}
                <span className="hidden sm:inline">{isOnline ? 'En línea' : 'Sin conexión'}</span>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="text-center py-8 text-text-secondary">Cargando mensajes...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <IconMessageCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No hay mensajes</p>
                  <p className="text-sm mt-1">Envía el primer mensaje</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-[var(--radius-lg)] ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-surface border border-border rounded-bl-md'
                        }`}
                      >
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <div className="mb-2">
                            <img
                              src={msg.attachment_url}
                              alt={msg.attachment_name || 'Imagen adjunta'}
                              className="max-w-full h-auto rounded-lg"
                            />
                          </div>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'file' && (
                          <a
                            href={msg.attachment_url}
                            download={msg.attachment_name}
                            className={`mb-2 flex items-center gap-2 p-2 rounded-lg ${
                              isMe 
                                ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' 
                                : 'bg-background hover:bg-state-hover'
                            } transition-colors`}
                          >
                            <IconPhoto size="sm" />
                            <span className="text-sm truncate flex-1">{msg.attachment_name}</span>
                            <IconDownload size="sm" />
                          </a>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-text-muted'}`}>
                          {formatTimeAgo(new Date(msg.created_at))}
                          {isMe && (
                            <span className="ml-2">{msg.is_read ? '✓✓' : '✓'}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-surface">
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
                    <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="hover:text-destructive"
                  >
                    <IconX size="sm" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                {/* Botón de adjuntar archivo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isOnline || uploading}
                  className="p-2.5 text-text-secondary hover:text-primary hover:bg-state-hover rounded-xl transition-colors disabled:opacity-50"
                  title="Adjuntar archivo"
                >
                  <IconPaperclip size="md" />
                </button>
                {/* Botón de emoji */}
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={!isOnline}
                    className="p-2.5 text-text-secondary hover:text-primary hover:bg-state-hover rounded-xl transition-colors disabled:opacity-50"
                  >
                    <IconMoodSmile size="md" />
                  </button>
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 p-3 bg-surface border border-border rounded-xl shadow-[var(--shadow-token-lg)] z-50">
                      <div className="grid grid-cols-8 gap-1">
                        {commonEmojis.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="p-1.5 hover:bg-state-hover rounded text-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isOnline ? "Escribe un mensaje..." : "Sin conexión..."}
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={sending || !isOnline}
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || sending || uploading || !isOnline}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <div className="h-5 w-5 animate-spin rounded-[var(--radius-full)] border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <IconSend size="md" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <IconMessageCircle className="h-16 w-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">Selecciona un contacto</p>
              <p className="text-sm mt-1">Para iniciar una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

