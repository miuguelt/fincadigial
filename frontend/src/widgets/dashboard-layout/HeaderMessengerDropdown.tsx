import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MessageCircle, Search, Loader2, Users, X } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { useAuth } from '@/features/auth/model/useAuth';
import { chatService, type ChatContact } from '@/entities/user/api/chat.service';
import { Avatar, AvatarFallback } from '@/shared/ui/common/Avatar';
import { openFloatingChat } from '@/features/chat/model/floatingChat';

/**
 * Lanzador de mensajes del encabezado.
 *
 * Solo lista compañeros y avisa cuántos mensajes hay sin leer: la conversación
 * siempre ocurre en la ventana flotante (`ChatWidget`). Antes este menú tenía su
 * propia vista de chat y podía quedar abierta al mismo tiempo que la flotante,
 * mostrando dos conversaciones distintas sobre la misma pantalla.
 */
export const HeaderMessengerDropdown: React.FC = () => {
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const startConversation = (contact?: ChatContact) => {
    setIsOpen(false);
    openFloatingChat(contact);
  };

  if (!user) return null;

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
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[11px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center animate-pulse shadow-md border-2 border-card">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Lista de compañeros: al elegir uno se abre la ventana flotante de chat */}
      {isOpen && (
        <div className="absolute right-0 top-12 sm:top-14 w-[min(380px,calc(100vw-1.5rem))] max-h-[min(520px,85vh)] bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl z-[1100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm tracking-tight text-foreground">Mensajes</h3>
              {unreadCount > 0 && (
                <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                  {unreadCount} sin leer
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Cerrar"
              aria-label="Cerrar lista de mensajes"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Buscador de compañeros */}
          <div className="p-3 border-b border-border/30 shrink-0">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={14}
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Buscar compañero..."
                aria-label="Buscar compañero"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-background/80 border border-border/60 rounded-xl text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Lista de Contactos */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {loadingContacts ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs">Cargando compañeros...</span>
              </div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => startConversation(contact)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/80 text-left transition-all group min-h-[48px] active:scale-[0.99]"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {contact.fullname.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-600 border-2 border-card rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-foreground fit-clamp group-hover:text-primary transition-colors">
                        {contact.fullname}
                      </p>
                      {contact.unread_count ? (
                        <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-sm animate-pulse">
                          {contact.unread_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider fit-clamp mt-0.5">
                      {contact.role}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center p-4">
                <Users size={24} className="opacity-30 mb-2" aria-hidden="true" />
                <p className="text-xs font-medium">No se encontraron compañeros en esta finca</p>
              </div>
            )}
          </div>

          <div className="border-t border-border/40 p-2 shrink-0">
            <button
              type="button"
              onClick={() => startConversation()}
              className="w-full min-h-10 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              Abrir la ventana de chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderMessengerDropdown;
