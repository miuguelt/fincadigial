import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Send,
  ExternalLink,
  Clock3,
  Check,
  CheckCheck,
  Smile,
  Loader2,
  Users,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  X,
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

interface SidebarChatSectionProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

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

export const SidebarChatSection: React.FC<SidebarChatSectionProps> = ({
  isCollapsed = false,
  onItemClick,
}) => {
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de contactos y conteo total de no leídos
  const loadContactsAndUnread = useCallback(async () => {
    if (!user) return;
    setLoadingContacts(true);
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
      console.error('Error cargando contactos en la barra lateral:', error);
    } finally {
      setLoadingContacts(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadContactsAndUnread();
  }, [user, loadContactsAndUnread]);

  // Sincronizar con eventos SSE en tiempo real
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
        console.error('Error cargando historial en la barra lateral:', error);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    void fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedContact, currentUserId]);

  // Auto-scroll al final del chat
  useEffect(() => {
    if (scrollRef.current && !loadingOlder) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedContact, loadingOlder]);

  // Carga de mensajes antiguos al subir en el scroll
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

        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          }
        });
      } catch (err) {
        console.error('Error cargando mensajes anteriores:', err);
      } finally {
        setLoadingOlder(false);
      }
    }
  };

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
    if ((!newMessage.trim() && !pendingFile) || !selectedContact || !Number.isFinite(currentUserId)) return;

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
      console.error('Error al enviar mensaje desde la barra lateral:', error);
    } finally {
      setSending(false);
      setUploading(false);
      inputRef.current?.focus();
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
            className="max-h-36 max-w-full rounded object-cover"
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
            className="max-h-40 max-w-full rounded"
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
        className="my-1 flex items-center gap-1.5 p-1.5 rounded-lg bg-background/80 hover:bg-background border border-border/60 text-foreground text-xs transition-colors"
      >
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-[11px]">{msg.attachment_name || 'Documento'}</p>
          <span className="text-[9px] text-muted-foreground uppercase">Descargar</span>
        </div>
        <Download size={12} className="text-muted-foreground shrink-0" />
      </a>
    );
  };

  const handleOpenFullScreen = () => {
    if (selectedContact) {
      navigate(`/chat?contactId=${selectedContact.id}`);
    } else {
      navigate('/chat');
    }
    onItemClick?.();
  };

  if (!user) return null;

  return (
    <div
      className={cn(
        'transition-all duration-200 rounded-xl overflow-hidden',
        !isCollapsed && isOpen
          ? 'bg-card/70 border border-border/80 p-2 shadow-sm mb-2'
          : 'border border-transparent mb-1 hover:bg-muted/60',
      )}
      role="menuitem"
    >
      {/* Botón Principal / Toggle en la Barra Lateral */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 group min-h-[44px]',
          isOpen
            ? 'bg-primary/10 text-primary font-bold'
            : 'bg-transparent text-foreground/90 font-medium',
        )}
        aria-expanded={isOpen}
        title="Comunicaciones y chat de la finca"
      >
        <div className="flex items-center gap-3 text-foreground/80 group-hover:text-primary transition-colors duration-200">
          <span
            className={cn(
              'flex items-center justify-center transition-transform duration-200 group-hover:scale-110 relative',
              isOpen && 'text-primary',
            )}
          >
            <MessageCircle className="h-5 w-5" />
            {unreadCount > 0 && isCollapsed && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          {!isCollapsed && (
            <span
              className={cn(
                'font-semibold text-sm tracking-tight text-left',
                isOpen && 'text-primary',
              )}
            >
              Comunicaciones
            </span>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <div className="transition-transform duration-200 text-muted-foreground group-hover:text-primary">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        )}
      </button>

      {/* Contenido Desplegable en la Barra Lateral */}
      {!isCollapsed && isOpen && (
        <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {!selectedContact ? (
            /* Vista 1: Lista de Compañeros con Buscador */
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={14}
                  />
                  <input
                    type="text"
                    placeholder="Buscar compañero..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-background/80 border border-border/60 rounded-lg text-xs outline-none focus:border-primary/50 min-h-[36px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOpenFullScreen}
                  title="Abrir pantalla completa"
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <ExternalLink size={15} />
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {loadingContacts ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Cargando compañeros...</span>
                  </div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setSelectedContact(contact)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/80 text-left transition-colors group min-h-[44px]"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8 border border-border/50">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {contact.fullname.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border border-card rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {contact.fullname}
                          </p>
                          {contact.unread_count ? (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                              {contact.unread_count}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
                          {contact.role}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-muted-foreground text-center">
                    <Users size={20} className="opacity-40 mb-1" />
                    <p className="text-xs font-medium">No se encontraron compañeros</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Vista 2: Conversación Activa dentro de la Barra Lateral */
            <div className="flex flex-col h-72 border border-border/60 bg-background/50 rounded-xl overflow-hidden">
              {/* Header de la conversación */}
              <div className="flex items-center justify-between px-2.5 py-2 bg-muted/40 border-b border-border/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors min-h-[36px]"
                  title="Volver a la lista"
                >
                  <ChevronLeft size={16} />
                  <span className="truncate max-w-[110px]">{selectedContact.fullname}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenFullScreen}
                  className="p-1.5 text-muted-foreground hover:text-primary rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Abrir en pantalla completa"
                >
                  <ExternalLink size={14} />
                </button>
              </div>

              {/* Mensajes con scroll */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-2 space-y-2 text-xs scrollbar-thin"
              >
                {loadingOlder && (
                  <div className="flex items-center justify-center py-1 gap-1 text-[10px] text-muted-foreground animate-in fade-in duration-200">
                    <Loader2 size={11} className="animate-spin text-primary" />
                    <span>Cargando anteriores...</span>
                  </div>
                )}
                {loadingMessages ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-[11px]">Inicia la conversación con</p>
                    <p className="font-bold text-foreground text-xs">{selectedContact.fullname}</p>
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
                            'max-w-[85%] rounded-xl px-2.5 py-1.5 shadow-sm text-xs',
                            isMe
                              ? 'bg-primary text-white rounded-br-none'
                              : 'bg-card border border-border/60 text-foreground rounded-bl-none',
                          )}
                        >
                          {renderAttachment(msg)}
                          {msg.message && <p className="break-words leading-tight whitespace-pre-wrap">{msg.message}</p>}
                          <div
                            className={cn(
                              'text-[9px] mt-0.5 font-medium flex items-center gap-1',
                              isMe ? 'text-white/70 justify-end' : 'text-muted-foreground justify-start',
                            )}
                          >
                            <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                            {isMe && msg.status === 'pending' && (
                              <Clock3 size={9} aria-label="Pendiente" />
                            )}
                            {isMe && msg.status === 'delivered' && (
                              <Check size={9} aria-label="Entregado" />
                            )}
                            {isMe && (msg.status === 'synced' || msg.is_read) && (
                              <CheckCheck size={9} aria-label="Leído" />
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
                <div className="flex flex-wrap gap-1 p-1 bg-muted/60 border-t border-border/40 shrink-0">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setNewMessage((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      className="p-1 text-sm hover:bg-card rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Vista previa del archivo adjunto */}
              {pendingFile && (
                <div className="px-2 py-1.5 bg-muted/70 border-t border-border/40 flex items-center justify-between shrink-0 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {pendingFile.type === 'image' ? (
                      <ImageIcon size={14} className="text-primary shrink-0" />
                    ) : pendingFile.type === 'video' ? (
                      <Video size={14} className="text-primary shrink-0" />
                    ) : (
                      <FileText size={14} className="text-primary shrink-0" />
                    )}
                    <span className="truncate text-[11px] font-medium">{pendingFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingFile(null)}
                    className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Footer Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-1.5 bg-card border-t border-border/40 flex items-center gap-1 shrink-0"
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
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Adjuntar archivo"
                >
                  <Paperclip size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmojis(!showEmojis)}
                  className={cn(
                    'p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center',
                    showEmojis && 'text-primary bg-primary/10',
                  )}
                  title="Emojis"
                >
                  <Smile size={16} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-background border border-border/60 rounded-lg text-xs outline-none focus:border-primary/50 min-h-[36px]"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={(!newMessage.trim() && !pendingFile) || sending || uploading}
                  className="h-9 w-9 p-0 rounded-lg shrink-0"
                  title="Enviar"
                >
                  {sending || uploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarChatSection;
