import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, ChatMessage, ChatContact } from '@/entities/user/api/chat.service';
import api from '@/shared/api/client';
import { useAuth } from '@/features/auth/model/useAuth';
import { subscribeSSE } from '@/lib/events';
import { proximitySync } from '@/shared/api/offline/ProximitySyncService';
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
  Wifi
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/app/providers/ToastContext';

export interface ChatWidgetProps {
  hideToggleButton?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ hideToggleButton = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { showToast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Escuchar evento global para abrir el chat desde acciones rápidas
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-chat-modal', handleOpenChat);
    return () => window.removeEventListener('open-chat-modal', handleOpenChat);
  }, []);

  // Notificar cambios en unreadCount a la aplicación/botón flotante único
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('chat-unread-count-updated', { detail: { unreadCount } }));
    } catch (e) {
      console.warn('Error publicando unreadCount:', e);
    }
  }, [unreadCount]);

  // Cargar contactos y conteo inicial con soporte de fallback
  useEffect(() => {
    if (!user) return;
    
    const initChat = async () => {
      try {
        setLoading(true);
        const [contactsRes, unreadRes] = await Promise.allSettled([
          chatService.getContacts(),
          chatService.getUnreadCount()
        ]);

        let loadedContacts: ChatContact[] = [];
        if (contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value?.data)) {
          loadedContacts = contactsRes.value.data;
        }

        // Si la API de chat no retorna contactos, cargar usuarios del sistema/finca como fallback
        if (loadedContacts.length === 0) {
          try {
            const fallbackRes = await api.get<any>('/users?limit=50');
            const rawData = fallbackRes.data;
            const userList = rawData?.items || rawData?.data || (Array.isArray(rawData) ? rawData : []);
            loadedContacts = userList
              .filter((u: any) => u.id !== user.id)
              .map((u: any) => ({
                id: u.id,
                fullname: u.full_name || u.fullname || u.nombre || u.email || `Usuario #${u.id}`,
                role: u.role || u.rol || 'Miembro',
                email: u.email || '',
                unread_count: 0
              }));
          } catch (err) {
            console.warn('Fallback de contactos:', err);
          }
        }

        setContacts(loadedContacts);

        if (unreadRes.status === 'fulfilled' && unreadRes.value?.data?.unread_count) {
          setUnreadCount(unreadRes.value.data.unread_count);
        }
      } catch (error) {
        console.error('Error al inicializar chat:', error);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [user]);

  // Suscribirse a eventos SSE para mensajes nuevos
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeSSE((event) => {
      if (event.event === 'new_chat_message') {
        const msg = event.data as ChatMessage;
        
        if (selectedContact && (msg.sender_id === selectedContact.id || msg.recipient_id === selectedContact.id)) {
          setMessages(prev => [...prev, msg]);
        } else {
          setUnreadCount(prev => prev + 1);
          setContacts(prev => prev.map(c => 
            c.id === msg.sender_id ? { ...c, unread_count: (c.unread_count || 0) + 1 } : c
          ));
        }
      }
    });

    return () => unsubscribe();
  }, [user, selectedContact]);

  // Cargar historial al seleccionar contacto
  useEffect(() => {
    if (selectedContact) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const res = await chatService.getHistory(selectedContact.id);
          setMessages(res.data || []);
          
          setUnreadCount(prev => Math.max(0, prev - (selectedContact.unread_count || 0)));
          setContacts(prev => prev.map(c => 
            c.id === selectedContact.id ? { ...c, unread_count: 0 } : c
          ));
        } catch (error) {
          console.error('Error al cargar historial:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [selectedContact]);

  // Scroll al fondo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedContact]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      const res = await chatService.sendMessage(selectedContact.id, text);
      if (res.data) {
        setMessages(prev => [...prev, res.data!]);
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
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
                        <p className="text-sm font-bold text-foreground truncate max-w-[150px]">
                          {selectedContact.fullname}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
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
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Chat Interno</p>
                    </div>
                  </div>
                )}
              </div>
              <button 
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
                        variant="outline" 
                        size="icon" 
                        title="Sincronizar por proximidad (Bluetooth)"
                        onClick={handleProximitySync}
                        disabled={isSyncing}
                        className={cn(
                          "h-10 w-10 shrink-0 rounded-xl border-white/5 bg-background/60",
                          isSyncing ? "text-primary border-primary/30" : "text-muted-foreground hover:text-primary"
                        )}
                      >
                        <Wifi size={18} className={cn(isSyncing && "animate-pulse")} />
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="px-3 pb-4 space-y-1">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map(contact => (
                          <button
                            key={contact.id}
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
                                <p className="text-sm font-bold text-foreground truncate">
                                  {contact.fullname}
                                </p>
                                {contact.unread_count ? (
                                  <span className="bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                                    {contact.unread_count}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
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
                    className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                  >
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
                        const isMe = msg.sender_id === user.id;
                        return (
                          <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={cn(
                              "max-w-[85%] rounded-lg px-4 py-2.5 text-sm shadow-sm relative group",
                              isMe 
                                ? "bg-primary text-white rounded-br-sm" 
                                : "bg-background/80 border border-white/5 text-foreground rounded-bl-sm"
                            )}>
                              <p className="leading-relaxed">{msg.message}</p>
                              <div className={cn(
                                "text-[9px] mt-1.5 font-medium flex items-center gap-1",
                                isMe ? "text-white/70 justify-end" : "text-muted-foreground justify-start"
                              )}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Footer Input */}
                  <div className="p-3 bg-background/40 backdrop-blur-xl border-t border-white/5 shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
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
                        disabled={!newMessage.trim()}
                        className="bg-primary hover:bg-primary/90 h-11 w-11 shrink-0 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Send size={18} className={newMessage.trim() ? "ml-1" : ""} />
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
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-card shadow-sm animate-pulse z-10">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </motion.button>
      )}
    </div>
  );
};
