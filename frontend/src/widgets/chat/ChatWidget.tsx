import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, ChatMessage, ChatContact } from '@/entities/user/api/chat.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { OfflineChatService, type ChatMessage as OfflineMessage } from '@/shared/api/offline/OfflineChatService';
import { proximitySync } from '@/shared/api/offline/ProximitySyncService';
import { useFieldNode, FieldNodeToggle, FieldNodePanel } from './FieldNodeSettings';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/shared/ui/common/Avatar';
import { cn } from '@/shared/ui/cn';
import {
  MessageCircle,
  X,
  Send,
  ChevronLeft,
  Search,
  User as UserIcon,
  Wifi,
  Clock3,
  Check,
  CheckCheck,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Download,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/app/providers/ToastContext';
import {
  OPEN_FLOATING_CHAT_EVENT,
  consumePendingFloatingChat,
  publishFloatingChatState,
  type FloatingChatContact,
} from '@/features/chat/model/floatingChat';

export interface ChatWidgetProps {
  hideToggleButton?: boolean;
}

const toWidgetMessage = (message: OfflineMessage): ChatMessage => ({
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

export const ChatWidget: React.FC<ChatWidgetProps> = ({ hideToggleButton = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pendingFile, setPendingFile] = useState<{ file: File; type: string; name: string } | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Nodo local de la finca: permite chatear por el Wi-Fi del predio cuando no hay internet.
  const [showNodeSettings, setShowNodeSettings] = useState(false);
  const fieldNode = useFieldNode(isOpen, () => { void fetchContactsAndUnread(); });

  // Espejo de `contacts` para leerlo desde manejadores de eventos sin re-suscribirlos.
  const contactsRef = useRef<ChatContact[]>([]);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  /*
    Único punto de entrada del chat: cualquier pantalla que quiera abrir una
    conversación emite `openFloatingChat(contacto)` y esta ventana se encarga
    del resto. Si el contacto ya venía en la lista cargada, se reutiliza esa
    ficha (trae rol y no leídos); si no, se arma una mínima con lo recibido.
  */
  useEffect(() => {
    const applyRequest = (requested?: FloatingChatContact) => {
      setIsOpen(true);

      if (!requested?.id) return;
      const known = contactsRef.current.find(c => Number(c.id) === Number(requested.id));
      setSelectedContact(known ?? {
        id: Number(requested.id),
        fullname: requested.fullname || `Usuario ${requested.id}`,
        role: requested.role || 'Usuario',
        email: '',
        unread_count: requested.unread_count,
      });
    };

    const handleOpenChat = (event: Event) => {
      consumePendingFloatingChat();
      applyRequest((event as CustomEvent<{ contact?: FloatingChatContact }>).detail?.contact);
    };

    window.addEventListener(OPEN_FLOATING_CHAT_EVENT, handleOpenChat);

    // Petición emitida antes de que esta ventana existiera (enlace directo a /chat).
    const pending = consumePendingFloatingChat();
    if (pending) applyRequest(pending.contact);

    return () => window.removeEventListener(OPEN_FLOATING_CHAT_EVENT, handleOpenChat);
  }, []);

  // Publicar qué se está viendo para que las notificaciones no dupliquen la conversación abierta.
  useEffect(() => {
    publishFloatingChatState({
      open: isOpen,
      contactId: isOpen && selectedContact ? Number(selectedContact.id) : null,
    });
  }, [isOpen, selectedContact]);


  // Notificar cambios en unreadCount a la aplicación/botón flotante único
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('chat-unread-count-updated', { detail: { unreadCount } }));
    } catch (e) {
      console.warn('Error publicando unreadCount:', e);
    }
  }, [unreadCount]);

  // Cargar contactos y conteo inicial con soporte de fallback
  const fetchContactsAndUnread = useCallback(async () => {
    if (!user) return;
    try {
      const [contactsRes, unreadRes] = await Promise.allSettled([
        chatService.getContacts(),
        chatService.getUnreadCount(),
      ]);

      let loadedContacts: ChatContact[] = [];
      if (contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value?.data)) {
        loadedContacts = contactsRes.value.data;
      }

      setContacts(loadedContacts);

      if (unreadRes.status === 'fulfilled' && unreadRes.value?.data?.unread_count !== undefined) {
        setUnreadCount(Number(unreadRes.value.data.unread_count));
      }
    } catch (error) {
      console.error('Error al actualizar contactos y no leídos:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void fetchContactsAndUnread().finally(() => setLoading(false));
  }, [user, fetchContactsAndUnread]);

  // Suscribirse a OfflineChatService para actualizar la conversación activa en tiempo real
  useEffect(() => {
    const currentUserId = Number(user?.id);
    if (!Number.isFinite(currentUserId)) return;
    OfflineChatService.setCurrentUser(currentUserId);
    return OfflineChatService.subscribe(() => {
      if (!selectedContact) return;
      setMessages(
        OfflineChatService.getConversation(selectedContact.id, currentUserId)
          .map(toWidgetMessage),
      );
    });
  }, [user?.id, selectedContact]);

  // Escuchar eventos en tiempo real para refrescar contactos y no leídos
  useEffect(() => {
    const onRealtime = () => {
      void fetchContactsAndUnread();
    };

    window.addEventListener('chat-realtime-updated', onRealtime);
    window.addEventListener('chat-unread-refresh', onRealtime);
    return () => {
      window.removeEventListener('chat-realtime-updated', onRealtime);
      window.removeEventListener('chat-unread-refresh', onRealtime);
    };
  }, [fetchContactsAndUnread]);

  // Cargar historial con OfflineChatService al seleccionar contacto y marcar como leído
  useEffect(() => {
    if (!selectedContact || !user) return;
    const currentUserId = Number(user.id);
    if (!Number.isFinite(currentUserId)) return;

    let isMounted = true;
    setHasMore(true);

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const history = await OfflineChatService.loadHistory(selectedContact.id, currentUserId, 30);
        if (isMounted) {
          setMessages(history.map(toWidgetMessage));
          setUnreadCount(prev => Math.max(0, prev - (selectedContact.unread_count || 0)));
          setContacts(prev => prev.map(c =>
            c.id === selectedContact.id ? { ...c, unread_count: 0 } : c
          ));
        }
        await OfflineChatService.markAsRead(currentUserId, selectedContact.id);
      } catch (error) {
        console.error('Error al cargar historial:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchHistory();
    return () => { isMounted = false; };
  }, [selectedContact, user]);

  // Auto-scroll al fondo al enviar o recibir mensajes
  useEffect(() => {
    if (scrollRef.current && !loadingOlder) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedContact, loadingOlder]);

  // Carga de mensajes anteriores al subir en el scroll (Cursor before_id)
  const handleScroll = async () => {
    const el = scrollRef.current;
    if (!el || !selectedContact || !hasMore || loadingOlder || loading) return;

    if (el.scrollTop <= 40) {
      const oldestMsg = messages[0];
      const oldestId = Number(oldestMsg?.id);
      if (!Number.isFinite(oldestId) || oldestId <= 0) return;

      const currentUserId = Number(user?.id);
      if (!Number.isFinite(currentUserId)) return;

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
        console.error('Error al cargar mensajes anteriores:', err);
      } finally {
        setLoadingOlder(false);
      }
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c =>
      c.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
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
    if ((!newMessage.trim() && !pendingFile) || !selectedContact) return;

    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    let attachmentPayload: { url?: string; type?: string; name?: string } | undefined = undefined;

    try {
      const senderId = Number(user?.id);
      if (!Number.isFinite(senderId)) throw new Error('AUTH_USER_REQUIRED');

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
        senderId,
        String(user?.fullname || 'Usuario'),
        selectedContact.id,
        text,
        attachmentPayload,
      );
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      showToast('Error al enviar mensaje o adjunto.', 'error');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const renderAttachment = (msg: ChatMessage) => {
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
            className="max-h-48 max-w-full rounded object-cover"
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
            className="max-h-48 max-w-full rounded"
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
        className="my-1.5 flex items-center gap-2 p-2.5 rounded-lg bg-background/80 hover:bg-background border border-border/60 text-foreground text-xs transition-colors"
      >
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="fit-clamp font-semibold text-xs">{msg.attachment_name || 'Documento'}</p>
          <span className="text-[11px] text-muted-foreground uppercase">Descargar archivo</span>
        </div>
        <Download size={14} className="text-muted-foreground shrink-0" />
      </a>
    );
  };

  const handleProximitySync = async () => {
    if (!('bluetooth' in navigator)) {
      showToast('Tu navegador o dispositivo no soporta sincronización por Bluetooth.', 'error');
      return;
    }

    try {
      setIsSyncing(true);
      showToast('Selecciona un dispositivo cercano...', 'info');

      const peer = await proximitySync.discoverPeers();

      if (peer) {
        showToast(`Conectando con ${peer.name}...`, 'info');
      } else {
        showToast('Asegúrate de que el otro dispositivo tenga Bluetooth activado.', 'warning');
      }
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.message?.includes('cancelled')) return;
      showToast(error.message || 'Error en sincronización por proximidad.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-16 right-4 sm:right-6 z-[9998] flex flex-col items-end pointer-events-none transition-all duration-300">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "w-[calc(100vw-32px)] sm:w-[360px] md:w-[380px]",
              "bg-card/95 backdrop-blur-3xl",
              "border border-white/10 rounded-xl",
              "shadow-[0_20px_60px_rgba(0,0,0,0.4)]",
              "mb-2 overflow-hidden flex flex-col pointer-events-auto h-[500px]"
            )}
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-white/5 bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {selectedContact ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedContact(null)}
                      className="h-8 w-8 rounded-full bg-background/50 hover:bg-background/80 flex items-center justify-center transition-colors border border-white/5"
                    >
                      <ChevronLeft size={18} className="text-foreground" />
                    </button>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9 border border-primary/20 shadow-sm">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {selectedContact.fullname.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <p className="text-sm font-bold text-foreground fit-clamp max-w-[150px]">
                          {selectedContact.fullname}
                        </p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                          {selectedContact.role}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Comunicaciones</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Chat Interno</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col min-h-0 bg-transparent relative">
              {!selectedContact ? (
                // Lista de Contactos
                <>
                  <div className="p-4 space-y-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                          placeholder="Buscar compañero..."
                          className="pl-10 h-10 bg-background/60 border-white/5 focus-visible:ring-primary rounded-xl text-sm"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Sincronizar por proximidad (Bluetooth)"
                        aria-label="Sincronizar por proximidad (Bluetooth)"
                        onClick={handleProximitySync}
                        disabled={isSyncing}
                        className={cn(
                          "h-10 w-10 shrink-0 rounded-xl border-white/5 bg-background/60",
                          isSyncing ? "text-primary border-primary/30" : "text-muted-foreground hover:text-primary"
                        )}
                      >
                        <Wifi size={18} className={cn(isSyncing && "animate-pulse")} />
                      </Button>
                      <FieldNodeToggle
                        status={fieldNode.probe.status}
                        open={showNodeSettings}
                        onToggle={() => setShowNodeSettings(value => !value)}
                      />
                    </div>

                    {showNodeSettings && <FieldNodePanel node={fieldNode} />}
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="px-3 pb-4 space-y-1">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map(contact => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => setSelectedContact(contact)}
                            className="w-full flex items-center gap-3.5 p-3 rounded-lg hover:bg-white/5 transition-all text-left group"
                          >
                            <div className="relative">
                              <Avatar className="h-11 w-11 border border-border/50">
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {contact.fullname.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 border-2 border-card rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-foreground fit-clamp">
                                  {contact.fullname}
                                </p>
                                {contact.unread_count ? (
                                  <span className="bg-primary text-primary-foreground text-[11px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                                    {contact.unread_count}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[11px] text-muted-foreground fit-clamp mt-0.5">
                                {contact.role}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <UserIcon size={32} strokeWidth={1.5} className="opacity-50" />
                          </div>
                          <p className="text-sm font-medium">No se encontraron contactos</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                // Ventana de Chat
                <>
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                  >
                    {loadingOlder && (
                      <div className="flex items-center justify-center py-2 gap-2 text-xs text-muted-foreground animate-in fade-in duration-200">
                        <Loader2 size={14} className="animate-spin text-primary" />
                        <span>Cargando mensajes anteriores...</span>
                      </div>
                    )}
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                          <MessageCircle size={24} />
                        </div>
                        <p className="text-xs text-muted-foreground">Inicia la conversación con<br/><strong className="text-foreground">{selectedContact.fullname.split(' ')[0]}</strong></p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMe = Number(msg.sender_id) === Number(user.id);
                        return (
                          <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={cn(
                              "max-w-[85%] rounded-lg px-4 py-2.5 text-sm shadow-sm relative group",
                              isMe
                                ? "bg-primary text-white rounded-br-sm"
                                : "bg-background/80 border border-white/5 text-foreground rounded-bl-sm"
                            )}>
                              {renderAttachment(msg)}
                              {msg.message && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>}
                              <div className={cn(
                                "text-[11px] mt-1.5 font-medium flex items-center gap-1",
                                isMe ? "text-white/70 justify-end" : "text-muted-foreground justify-start"
                              )}>
                                 {format(new Date(msg.created_at), 'HH:mm')}
                                 {isMe && msg.status === 'pending' && <Clock3 size={11} aria-label="Pendiente" />}
                                 {isMe && msg.status === 'delivered' && <Check size={11} aria-label="Entregado" />}
                                 {isMe && (msg.status === 'synced' || msg.is_read) && <CheckCheck size={11} aria-label="Leído" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Vista previa del archivo adjunto */}
                  {pendingFile && (
                    <div className="px-3 py-2 bg-muted/60 border-t border-border/40 flex items-center justify-between shrink-0 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {pendingFile.type === 'image' ? (
                          <ImageIcon size={16} className="text-primary shrink-0" />
                        ) : pendingFile.type === 'video' ? (
                          <Video size={16} className="text-primary shrink-0" />
                        ) : (
                          <FileText size={16} className="text-primary shrink-0" />
                        )}
                        <span className="fit-clamp font-medium">{pendingFile.name}</span>
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
                  <div className="p-3 bg-background/40 backdrop-blur-xl border-t border-white/5 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-white/5"
                        title="Adjuntar documento, imagen o video"
                      >
                        <Paperclip size={18} />
                      </Button>

                      <Input
                        placeholder="Escribe un mensaje..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 h-11 bg-background border-white/5 focus-visible:ring-primary rounded-xl text-sm"
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={(!newMessage.trim() && !pendingFile) || sending || uploading}
                        className="bg-primary hover:bg-primary/90 h-11 w-11 shrink-0 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {sending || uploading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} className={newMessage.trim() ? "ml-1" : ""} />
                        )}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button del Chat Flotante Único Estandarizado */}
      {!hideToggleButton && (
        <motion.button
          whileTap={{ scale: 0.90 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "fixed bottom-3 right-[3.75rem] sm:bottom-4 sm:right-[4.5rem] z-[9998]",
            "h-10 w-10 sm:h-11 sm:w-11 rounded-full",
            "flex items-center justify-center relative",
            "backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md",
            isOpen
              ? "bg-card/90 text-foreground border border-border/50 opacity-100 scale-105"
              : "bg-card/70 dark:bg-card/60 text-foreground/70 hover:text-foreground border border-border/40 hover:border-primary/50 opacity-75 hover:opacity-100 hover:scale-105"
          )}
          aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
          </motion.div>

          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-card shadow-sm animate-pulse z-10">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </motion.button>
      )}
    </div>
  );
};
