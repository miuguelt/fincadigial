import React, { useState } from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import { Menu, User, LogOut, MessageCircle, Search, Bell, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/ui/cn.ts';
import { Badge } from '@/shared/ui/badge';
import { subscribeUserToPush } from '@/shared/lib/pushNotifications';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '@/widgets/dashboard/ThemeToggle';
import { useUnreadMessages } from '@/features/chat/hooks/useUnreadMessages';
import { useSemanticSearch } from '@/features/search/hooks/useSemanticSearch';
import { NotificationCenter } from '@/shared/components/notifications';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

import { FincaSelector } from '@/features/multi-finca/ui/FincaSelector';
import { SyncStatus } from '@/widgets/dashboard/SyncStatus';

interface GlobalSearchBarProps {
  fullWidth?: boolean;
}

const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ fullWidth = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { query, setQuery, allResults, loading } = useSemanticSearch({ debounceMs: 400 });
  const navigate = useNavigate();

  return (
    <div className={cn("relative group", fullWidth && "w-full")}>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-2xl bg-muted/40 hover:bg-muted/60 border border-transparent hover:border-primary/20 transition-all duration-300 cursor-pointer",
          fullWidth
            ? "w-full"
            : cn("w-48 lg:w-64", isOpen && "w-80 lg:w-96"),
          isOpen && "ring-2 ring-primary/20 bg-background border-primary/30 shadow-lg shadow-primary/5"
        )}
        onClick={() => setIsOpen(true)}
      >
        <Search className={cn("h-4 w-4 transition-colors", isOpen ? "text-primary" : "text-muted-foreground")} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar..."
          className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-muted-foreground/60 font-medium"
        />
        {!isOpen && (
          <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60">
            ⌘K
          </kbd>
        )}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "absolute left-0 top-full mt-2 bg-card/95 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500",
            fullWidth ? "w-full" : "w-full min-w-[320px] max-w-md"
          )}>
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              {loading && (
                <div className="p-8 text-center">
                  <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium animate-pulse">Buscando en Global Mind...</p>
                </div>
              )}
              
              {!loading && allResults.length === 0 && query.length >= 2 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <p className="text-2xl mb-2">🔍</p>
                  <p>No se encontraron resultados para <span className="font-bold text-foreground">"{query}"</span></p>
                </div>
              )}

              {!loading && allResults.length === 0 && query.length < 2 && (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  Escribe al menos 2 caracteres para buscar...
                </div>
              )}
              
              {allResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    navigate(result.url);
                    setIsOpen(false);
                  }}
                  className="w-full px-5 py-4 text-left hover:bg-primary/5 transition-all flex items-start gap-3 border-b border-border/30 last:border-0 group/item"
                >
                  <div className="mt-1 p-2 rounded-xl bg-muted group-hover/item:bg-primary/10 transition-colors">
                    <Search className="h-4 w-4 text-muted-foreground group-hover/item:text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-foreground truncate">{result.name || result.title}</span>
                      <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter bg-muted text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary">
                        {result.type}
                      </Badge>
                    </div>
                    {result.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1 group-hover/item:text-muted-foreground/80">
                        {result.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="p-3 bg-muted/30 border-t border-border/50 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Resultados impulsados por IA</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/shared/ui/dropdown-menu';
import { ChevronDown, Settings, CreditCard, LifeBuoy } from 'lucide-react';

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages(60000);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm transition-all duration-300" role="banner">
      {/* ── Fila principal del header ── */}
      <div className="flex items-center justify-between h-16 px-3 sm:px-6">

        {/* Sección izquierda — min-w-0 evita flex blowout */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-border bg-surface hover:bg-state-hover focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm"
            aria-label={isSidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5 text-text-primary" />
          </button>

          <div className="hidden lg:flex flex-col flex-shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 leading-tight">Software Ganadero</span>
            <span className="text-sm font-black tracking-tighter text-text-primary leading-tight">VILLA LUZ</span>
          </div>

          <div className="h-6 w-[1px] bg-border mx-1 hidden md:block flex-shrink-0" />

          {/* FincaSelector acotado para que no desborde en móvil */}
          <div className="min-w-0 max-w-[140px] sm:max-w-[200px] lg:max-w-xs">
            <FincaSelector />
          </div>

          <div className="hidden lg:block flex-shrink-0">
            <SyncStatus />
          </div>

          {/* Barra de búsqueda — visible desde md, en sm se usa el icono de abajo */}
          <div className="hidden md:block flex-shrink-0">
            <GlobalSearchBar />
          </div>
        </div>

        {/* Sección derecha */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Icono de búsqueda sólo en móvil/tablet (<md) */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl hover:bg-primary/10 text-text-secondary hover:text-primary transition-all"
            aria-label={mobileSearchOpen ? 'Cerrar búsqueda' : 'Buscar'}
            aria-expanded={mobileSearchOpen}
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Controles secundarios — ocultos en móvil, en el dropdown del avatar */}
          <div className="hidden sm:flex items-center gap-1 sm:gap-2">
            <ThemeToggle />

            <NotificationCenter />

            <button
              onClick={() => navigate('/chat')}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-primary/10 text-text-secondary hover:text-primary transition-all"
              title="Mensajes"
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-bold rounded-full animate-pulse shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Avatar / menú de perfil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-1 pr-1 sm:pr-2 py-1 rounded-2xl hover:bg-state-hover border border-transparent hover:border-border transition-all group">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center text-white font-bold shadow-md shadow-primary/20 ring-2 ring-background ring-offset-2 ring-offset-primary/10 group-hover:scale-105 transition-transform">
                  {user?.fullname?.[0] || <User className="h-4 w-4 sm:h-5 sm:w-5" />}
                </div>
                <div className="hidden sm:flex flex-col items-start mr-1">
                  <span className="text-xs font-bold text-text-primary leading-none truncate max-w-[100px]">{user?.fullname?.split(' ')[0]}</span>
                  <span className="text-[10px] font-medium text-text-muted uppercase tracking-tighter leading-none mt-1">{user?.role}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-text-muted group-hover:text-primary transition-colors hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl border-border shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-text-primary">{user?.fullname}</p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Accesos rápidos para móvil (<sm) */}
              <div className="sm:hidden grid grid-cols-3 gap-1 mb-2">
                <DropdownMenuItem onClick={() => {}} className="justify-center h-10 rounded-xl bg-surface">
                  <ThemeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/chat')} className="justify-center h-10 rounded-xl bg-surface relative">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  {unreadCount > 0 && <span className="absolute top-1 right-3 h-2 w-2 bg-primary rounded-full" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => e.preventDefault()}
                  className="justify-center h-10 rounded-xl bg-surface p-0"
                >
                  <NotificationCenter />
                </DropdownMenuItem>
              </div>

              <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-xl cursor-pointer py-2.5">
                <User className="mr-2 h-4 w-4 text-primary" />
                <span>Mi Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}} className="rounded-xl cursor-pointer py-2.5">
                <CreditCard className="mr-2 h-4 w-4 text-primary" />
                <span>Suscripción</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}} className="rounded-xl cursor-pointer py-2.5">
                <Settings className="mr-2 h-4 w-4 text-primary" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {}} className="rounded-xl cursor-pointer py-2.5">
                <LifeBuoy className="mr-2 h-4 w-4 text-primary" />
                <span>Ayuda Técnica</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="rounded-xl cursor-pointer py-2.5 text-destructive focus:bg-destructive focus:text-white">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Fila de búsqueda expandible en móvil (<md) ── */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
          <GlobalSearchBar fullWidth />
        </div>
      )}
    </header>
  );
};

export default Header;
