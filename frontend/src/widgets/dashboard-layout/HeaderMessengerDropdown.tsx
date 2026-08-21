import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Search,
  ChevronLeft,
  Send,
  ExternalLink,
  Clock3,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  X,
  FileText,
  Video,
  Image as ImageIcon,
  Loader2,
  Users,
  Download,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { useAuth } from '@/features/auth/model/useAuth';
import {
  chatService,
  type ChatContact,
  type ChatMessage as ServiceChatMessage,
} from '@/entities/user/api/chat.service';
import {
  OfflineChatService,
  type ChatMessage as OfflineMessage,
} from '@/shared/api/offline/OfflineChatService';
import { Avatar, AvatarFallback } from '@/shared/ui/common/Avatar';
import { Button } from '@/shared/ui/button';
import { format } from 'date-fns';

const QUICK_EMOJIS = ['👍', '🙏', '✅', '⚠️', '🐮', '💉', '🚜', '❤️'];

const toWidgetMessage = (message: OfflineMessage): ServiceChatMessage => ({
  id: message.id,
  finca_id: 0,
  sender_id: message.senderId,
  sender_name: message.senderName || 'Usuario',
  recipient_id: message.recipientId,
  recipient_name: '',
  message: message.content,
  is_read: message.status === 'synced',
  client_message_id: message.clientMessageId,
  read_at: message.readAt,
  status: message.status,
  attachment_url: message.attachmentUrl,
  attachment_type: message.attachmentType,
  attachment_name: message.attachmentName,
  created_at: message.createdAt,
});

export const HeaderMessengerDropdown: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = Number(user?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ServiceChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; type: string; name: string } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialScrollDone = useRef(false);

  // Cargar contactos y conteo global de no leídos
  const loadContactsAndUnread = useCallback(async () => {
    if (!user) return;
    try {
      const [contactsRes, unreadRes] = await Promise.allSettled([
        chatService.getContacts(),
        chatService.getUnreadCount(),
      ]);

      if (contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value?.data)) {
        setContacts(contactsRes.value.data);
      }

      if (unreadRes.status === 'fulfilled' && unreadRes.value?.data?.unread_count !== undefined) {
        setUnreadCount(Number(unreadRes.value.data.unread_count));
      }
    } catch (error) {
      console.error('Error cargando contactos en HeaderMessengerDropdown:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadContactsAndUnread();
  }, [user, loadContactsAndUnread]);

  // Sincronizar con eventos SSE y cambios de conteo
  useEffect(() => {
    const onRealtime = () => { void loadContactsAndUnread(); };
    const onCountUpdated = (e: Event) => {
      const count = (e as CustomEvent<{ unreadCount?: number }>).detail?.unreadCount;
      if (typeof count === 'number') setUnreadCount(count);
    };

    window.addEventListener('chat-realtime-updated', onRealtime);
    window.addEventListener('chat-unread-refresh', onRealtime);
    window.addEventListener('chat-unread-count-updated', onCountUpdated);
    return () => {
      window.removeEventListener('chat-realtime-updated', onRealtime);
      window.removeEventListener('chat-unread-refresh', onRealtime);
      window.removeEventListener('chat-unread-count-updated', onCountUpdated);
    };
  }, [loadContactsAndUnread]);

  // Suscribirse a OfflineChatService para actualizar la conversación activa en vivo
  useEffect(() => {
    if (!Number.isFinite(currentUserId)) return;
    OfflineChatService.setCurrentUser(currentUserId);
    return OfflineChatService.subscribe(() => {
      if (!selectedContact) return;
      setMessages(
        OfflineChatService.getConversation(selectedContact.id, currentUserId)
          .map(toWidgetMessage),
      );
    });
  }, [currentUserId, selectedContact]);

  // Cargar historial al seleccionar un contacto
  useEffect(() => {
    if (!selectedContact || !Number.isFinite(currentUserId)) return;

    let isMounted = true;
    isInitialScrollDone.current = false;
    setHasMore(true);

    const fetchHistory = async () => {
      setLoadingMessages(true);
      try {
        const history = await OfflineChatService.loadHistory(selectedContact.id, currentUserId, 30);
        if (isMounted) {
          setMessages(history.map(toWidgetMessage));
          setUnreadCount((prev) => Math.max(0, prev - (selectedContact.unread_count || 0)));
          setContacts((prev) =>
            prev.map((c) => (c.id === selectedContact.id ? { ...c, unread_count: 0 } : c)),
          );
        }
        await OfflineChatService.markAsRead(currentUserId, selectedContact.id);
      } catch (error) {
        console.error('Error cargando historial:', error);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    void fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedContact, currentUserId]);

  // Auto-scroll al final del chat al abrir o enviar mensajes nuevos
  useEffect(() => {
    if (scrollRef.current && !loadingOlder) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedContact, loadingOlder]);

  // Cargar mensajes antiguos al hacer scroll hacia arriba (Paginación inversa transparente)
  const handleScroll = async () => {
    const el = scrollRef.current;
    if (!el || !selectedContact || !hasMore || loadingOlder || loadingMessages) return;

    if (el.scrollTop <= 40) {
      const oldestMsg = messages[0];
      const oldestId = Number(oldestMsg?.id);
      if (!Number.isFinite(oldestId) || oldestId <= 0) return;

      setLoadingOlder(true);
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;

      try {
        const res = await OfflineChatService.loadOlderMessages(
          selectedContact.id,
          oldestId,
          currentUserId,
          30,
        );
        setHasMore(res.hasMore);

        // Preservar la posición del scroll tras cargar los mensajes anteriores
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }
        });
      } catch (err) {
        console.error('Error cargando mensajes antiguos:', err);
      } finally {
        setLoadingOlder(false);
      }
    }
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(
      (c) =>
        c.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [contacts, searchQuery]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    setPendingFile({ file, type, name: file.name });
    e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || !selectedContact || !Number.isFinite(currentUserId)) {
      return;
    }

    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    let attachmentPayload: { url?: string; type?: string; name?: string } | undefined = undefined;

    try {
      if (pendingFile) {
        setUploading(true);
        const uploadRes = await chatService.uploadFile(pendingFile.file);
        if (uploadRes?.data) {
          attachmentPayload = {
            url: uploadRes.data.url,
            type: uploadRes.data.type,
            name: uploadRes.data.name,
          };
        }
        setPendingFile(null);
        setUploading(false);
      }

      await OfflineChatService.send(
        currentUserId,
        String(user?.fullname || 'Usuario'),
        selectedContact.id,
        text,
        attachmentPayload,
      );
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      setSending(false);
      setUploading(false);
      inputRef.current?.focus();
    }
  };

  const handleOpenFullScreen = () => {
    setIsOpen(false);
    if (selectedContact) {
      navigate(`/chat?contactId=${selectedContact.id}`);
    } else {
      navigate('/chat');
    }
  };

  const renderAttachment = (msg: ServiceChatMessage) => {
    if (!msg.attachment_url) return null;
    const type = msg.attachment_type || 'file';

    if (type === 'image') {
      return (
        <a
          href={msg.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block my-1 rounded-lg overflow-hidden border border-border/40 hover:opacity-90 transition-opacity"
        >
          <img
            src={msg.attachment_url}
            alt={msg.attachment_name || 'Imagen adjunta'}
            loading="lazy"
            decoding="async"
            className="max-h-40 max-w-full rounded object-cover"
          />
        </a>
      );
    }

    if (type === 'video') {
      return (
        <div className="my-1 rounded-lg overflow-hidden border border-border/40 bg-black/40">
          <video
            src={msg.attachment_url}
            preload="none"
            controls
            className="max-h-44 max-w-full rounded"
          />
        </div>
      );
    }

    return (
      <a
        href={msg.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        download={msg.attachment_name || 'archivo'}
        className="my-1.5 flex items-center gap-2 p-2 rounded-lg bg-background/80 hover:bg-background border border-border/60 text-foreground text-xs transition-colors"
      >
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-xs">{msg.attachment_name || 'Documento'}</p>
          <span className="text-[10px] text-muted-foreground uppercase">Descargar archivo</span>
        </div>
        <Download size={14} className="text-muted-foreground shrink-0" />
      </a>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Circular Estilo Facebook Messenger */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setLoadingContacts(true);
            void loadContactsAndUnread().finally(() => setLoadingContacts(false));
          }
        }}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95',
          isOpen && 'bg-primary/15 text-primary ring-2 ring-primary/20',
        )}
        title="Mensajes y chat de la finca"
        aria-label="Abrir mensajes y chat"
        aria-expanded={isOpen}
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center animate-pulse shadow-md border-2 border-card">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Ventana Flotante Dropdown / Messenger */}
      {isOpen && (
        <div className="absolute right-0 top-12 sm:top-14 w-[min(380px,calc(100vw-1.5rem))] h-[520px] max-h-[85vh] bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl z-[1100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {!selectedContact ? (
            /* Vista 1: Lista de Todos los Usuarios con Notificaciones */
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm tracking-tight text-foreground">Mensajes</h3>
                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {unreadCount} sin leer
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleOpenFullScreen}
                    title="Abrir en pantalla completa"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Cerrar"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Buscador de compañeros */}
              <div className="p-3 border-b border-border/30 shrink-0">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={14}
                  />
                  <input
                    type="text"
                    placeholder="Buscar compañero..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-2 bg-background/80 border border-border/60 rounded-xl text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Lista de Contactos */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                {loadingContacts ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs">Cargando compañeros...</span>
                  </div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setSelectedContact(contact)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/80 text-left transition-all group min-h-[48px] active:scale-[0.99]"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {contact.fullname.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-card rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {contact.fullname}
                          </p>
                          {contact.unread_count ? (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-sm animate-pulse">
                              {contact.unread_count}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider truncate mt-0.5">
                          {contact.role}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-4">
                    <Users size={24} className="opacity-30 mb-2" />
                    <p className="text-xs font-medium">No se encontraron compañeros en esta finca</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Vista 2: Conversación Interactiva Flotante */
            <div className="flex flex-col h-full">
              {/* Header de conversación */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 bg-muted/20 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContact(null);
                    setPendingFile(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
                >
                  <ChevronLeft size={18} />
                  <div className="flex items-center gap-2 text-left">
                    <Avatar className="h-7 w-7 border border-border/40">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                        {selectedContact.fullname.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate max-w-[130px] leading-tight">
                        {selectedContact.fullname}
                      </p>
                      <p className="text-[9px] text-emerald-500 font-semibold leading-tight">En línea</p>
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleOpenFullScreen}
                    title="Abrir pantalla completa"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
                  >
                    <ExternalLink size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Cerrar"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Mensajes con scroll */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs scrollbar-thin bg-background/30"
              >
                {loadingOlder && (
                  <div className="flex items-center justify-center py-1.5 gap-1.5 text-[10px] text-muted-foreground animate-in fade-in duration-200">
                    <Loader2 size={12} className="animate-spin text-primary" />
                    <span>Cargando mensajes anteriores...</span>
                  </div>
                )}
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs">Cargando conversación...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                    <p className="text-xs">Inicia la conversación con</p>
                    <p className="font-bold text-foreground text-sm mt-0.5">{selectedContact.fullname}</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = Number(msg.sender_id) === currentUserId;
                    return (
                      <div
                        key={msg.id || idx}
                        className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl px-3 py-2 shadow-sm text-xs',
                            isMe
                              ? 'bg-primary text-white rounded-br-xs'
                              : 'bg-card border border-border/60 text-foreground rounded-bl-xs',
                          )}
                        >
                          {renderAttachment(msg)}
                          {msg.message && (
                            <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          )}
                          <div
                            className={cn(
                              'text-[9px] mt-1 font-medium flex items-center gap-1',
                              isMe ? 'text-white/75 justify-end' : 'text-muted-foreground justify-start',
                            )}
                          >
                            <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                            {isMe && msg.status === 'pending' && (
                              <Clock3 size={10} aria-label="Pendiente" />
                            )}
                            {isMe && msg.status === 'delivered' && (
                              <Check size={10} aria-label="Entregado" />
                            )}
                            {isMe && (msg.status === 'synced' || msg.is_read) && (
                              <CheckCheck size={10} aria-label="Leído" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selector de emojis rápido */}
              {showEmojis && (
                <div className="flex flex-wrap gap-1 p-2 bg-muted/60 border-t border-border/40 shrink-0">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewMessage((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      className="p-1.5 text-base hover:bg-card rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Vista previa del archivo adjunto */}
              {pendingFile && (
                <div className="px-3 py-2 bg-muted/70 border-t border-border/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {pendingFile.type === 'image' ? (
                      <ImageIcon size={16} className="text-primary shrink-0" />
                    ) : pendingFile.type === 'video' ? (
                      <Video size={16} className="text-primary shrink-0" />
                    ) : (
                      <FileText size={16} className="text-primary shrink-0" />
                    )}
                    <span className="text-xs truncate font-medium">{pendingFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingFile(null)}
                    className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Footer Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-2 bg-card border-t border-border/40 flex items-center gap-1.5 shrink-0"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="Adjuntar documento, imagen o video"
                >
                  <Paperclip size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmojis(!showEmojis)}
                  className={cn(
                    'p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center',
                    showEmojis && 'text-primary bg-primary/10',
                  )}
                  title="Emojis"
                >
                  <Smile size={17} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-border/60 rounded-xl text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 min-h-[40px]"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={(!newMessage.trim() && !pendingFile) || sending || uploading}
                  className="h-10 w-10 p-0 rounded-xl shrink-0 shadow-sm"
                  title="Enviar"
                >
                  {sending || uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderMessengerDropdown;
