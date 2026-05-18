import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, ChatMessage, ChatContact } from '@/entities/user/api/chat.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { subscribeSSE } from '@/lib/events';
import { proximitySync } from '@/shared/api/offline/ProximitySyncService';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/common/Avatar';
import { 
  MessageCircle, 
  X, 
  Send, 
  ChevronLeft, 
  Search,
  User as UserIcon,
  Circle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/app/providers/ToastContext';

export const ChatWidget: React.FC = () => {
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

  // Cargar contactos y conteo inicial
  useEffect(() => {
    if (!user) return;
    
    const initChat = async () => {
      try {
        // Temporalmente deshabilitado hasta que el backend se reinicie
        // const [contactsRes, unreadRes] = await Promise.all([
        //   chatService.getContacts(),
        //   chatService.getUnreadCount()
        // ]);
        // setContacts(contactsRes.data || []);
        // setUnreadCount(unreadRes.data?.unread_count || 0);
      } catch (error) {
        console.error('Error al inicializar chat:', error);
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
        
        // Si el mensaje es para el contacto seleccionado actualmente
        if (selectedContact && (msg.sender_id === selectedContact.id || msg.recipient_id === selectedContact.id)) {
          setMessages(prev => [...prev, msg]);
          // Si estamos viendo el chat, marcar como leído inmediatamente (el backend lo hace al pedir historial, pero aquí es UI)
        } else {
          // Si no, incrementar contador global y del contacto
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
          
          // Actualizar contadores locales
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

  // Scroll al fondo al recibir mensajes
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
      showToast('Selecciona un dispositivo Villa Luz cercano para sincronizar.', 'info');
      
      const peer = await proximitySync.discoverPeers();
      
      if (peer) {
        showToast(`Conectando con ${peer.name}...`, 'info');
      } else {
        showToast('Asegúrate de que el otro dispositivo tenga el Bluetooth activado y la app abierta.', 'warning');
      }
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.message?.includes('cancelled')) {
        // Usuario canceló el diálogo, no mostrar error
        return;
      }
      
      console.error('[VLMSP] Error:', error);
      showToast(error.message || 'No se pudo completar la sincronización por proximidad.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 mb-4 overflow-hidden flex flex-col pointer-events-auto h-[500px]"
          >
            {/* Header */}
            <div className="bg-primary p-4 text-primary-foreground flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                {selectedContact ? (
                  <>
                    <button onClick={() => setSelectedContact(null)} className="hover:bg-primary/80 p-1 rounded-full transition-colors">
                      <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 border border-white/20">
                        <AvatarFallback className="bg-primary/80 text-primary-foreground text-xs">{selectedContact.fullname.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold leading-none">{selectedContact.fullname}</p>
                        <p className="text-[10px] opacity-80">{selectedContact.role}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <MessageCircle size={20} />
                    <p className="font-bold">Chat Interno Villa Luz</p>
                  </div>
                )}
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-primary/80 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
              {!selectedContact ? (
                // Lista de Contactos
                <>
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <Input 
                          placeholder="Buscar compañero..." 
                          className="pl-9 bg-white border-gray-200"
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
                        className={`border-primary/30 text-primary hover:bg-primary/10 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
                      >
                        <Circle size={16} className={`${isSyncing ? 'fill-primary/60' : 'animate-pulse fill-primary'}`} />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map(contact => (
                          <button
                            key={contact.id}
                            onClick={() => setSelectedContact(contact)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all text-left group"
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10 border border-gray-100">
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">{contact.fullname.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success-500 border-2 border-white rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">{contact.fullname}</p>
                                {contact.unread_count ? (
                                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {contact.unread_count}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{contact.role}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                          <UserIcon size={40} strokeWidth={1} />
                          <p className="text-sm mt-2">No se encontraron contactos</p>
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
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-xs text-gray-400">Di hola a {selectedContact.fullname.split(' ')[0]}</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMe = msg.sender_id === user.id;
                        return (
                          <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                              isMe 
                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                : 'bg-card text-foreground rounded-tl-none border border-border'
                            }`}>
                              <p>{msg.message}</p>
                              <p className={`text-[10px] mt-1 text-right opacity-70`}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Footer Input */}
                  <div className="p-3 bg-white border-t border-gray-100">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input 
                        placeholder="Escribe un mensaje..." 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                        autoFocus
                      />
                      <Button 
                        type="submit" 
                        size="icon" 
                        disabled={!newMessage.trim()}
                        className="bg-primary hover:bg-primary/80 h-9 w-9 shrink-0 rounded-full"
                      >
                        <Send size={16} />
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto h-14 w-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-primary-foreground relative hover:bg-primary/80 transition-colors"
      >
        {isOpen ? <X /> : <MessageCircle />}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
};
