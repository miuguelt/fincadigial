import React, { useState } from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import { Menu, User, LogOut, MessageCircle, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/ui/cn.ts';
import { Badge } from '@/shared/ui/badge';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '@/widgets/dashboard/ThemeToggle';
import { useUnreadMessages } from '@/features/chat/hooks/useUnreadMessages';
import { useSemanticSearch } from '@/features/search/hooks/useSemanticSearch';
import { NotificationCenter } from '@/shared/components/notifications';
import { FincaSelector } from '@/features/multi-finca/ui/FincaSelector';
import { SyncStatus } from '@/widgets/dashboard/SyncStatus';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

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
          fullWidth ? "w-full" : "w-full max-w-[240px]",
          isOpen && "ring-2 ring-primary/20 bg-background border-primary/30 shadow-lg shadow-primary/5"
        )}
        onClick={() => setIsOpen(true)}
      >
        <Search className={cn("h-4 w-4 flex-shrink-0 transition-colors", isOpen ? "text-primary" : "text-muted-foreground")} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar..."
          className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-muted-foreground/60 font-medium min-w-0"
        />
        {!isOpen && !fullWidth && (
          <kbd className="hidden xl:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60 flex-shrink-0">
            ⌘K
          </kbd>
        )}
      </div>

      {isOpen && (query.trim().length >= 2 || loading) && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "absolute left-0 top-full mt-2 bg-card/95 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500",
            fullWidth ? "w-full" : "w-full min-w-[300px] max-w-md"
          )}>
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              {loading && (
                <div className="p-8 text-center">
                  <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium animate-pulse">Buscando...</p>
                </div>
              )}
              
              {!loading && allResults.length === 0 && query.length >= 2 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <p className="text-2xl mb-2">🔍</p>
                  <p>Sin resultados para <span className="font-bold text-foreground">"{query}"</span></p>
                </div>
              )}

              {!loading && allResults.length === 0 && query.length < 2 && (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  Escribe al menos 2 caracteres...
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
                      <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter bg-muted text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary flex-shrink-0">
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Impulsado por IA</p>
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
    <header className="sticky top-0 z-[1000] w-full h-14 sm:h-16 border-b border-border/30 bg-background/80 backdrop-blur-xl shadow-sm" role="banner">
      <div className="flex h-14 sm:h-16 items-center px-2 sm:px-3 lg:px-4 gap-2">

        {/* IZQUIERDA: Hamburger + Brand + FincaSelector */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border bg-surface hover:bg-state-hover transition-all"
            aria-label={isSidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          
          <div className="hidden xl:flex flex-col flex-shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary/70 leading-tight">Software Ganadero</span>
            <span className="text-xs font-black tracking-tight leading-tight">VILLA LUZ</span>
          </div>

          <div className="hidden xl:block h-5 w-[1px] bg-border flex-shrink-0" />

          <div className="flex-shrink-0">
            <FincaSelector />
          </div>
        </div>

        {/* CENTRO: Search (solo xl+) */}
        <div className="hidden xl:flex flex-1 justify-center">
          <GlobalSearchBar />
        </div>

        {/* DERECHA: Compact actions */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {/* Search toggle (<xl) */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="xl:hidden flex h-8 w-8 items-center justify-center rounded-xl hover:bg-primary/10 transition-all"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* SyncStatus - solo xl */}
          <div className="hidden xl:block">
            <SyncStatus />
          </div>

          {/* Compact icon cluster */}
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <NotificationCenter />
            <button
              onClick={() => navigate('/chat')}
              className="relative flex h-8 w-8 items-center justify-center rounded-xl hover:bg-primary/10 transition-all"
              title="Mensajes"
            >
              <MessageCircle className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center bg-primary text-primary-foreground text-[8px] font-bold rounded-full animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="h-5 w-[1px] bg-border mx-0.5" />

          {/* Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-2xl hover:bg-state-hover transition-all">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center text-white font-bold shadow-md text-xs sm:text-sm">
                  {user?.fullname?.[0] || <User className="h-3.5 w-3.5" />}
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-xs font-bold leading-none truncate max-w-[80px]">{user?.fullname?.split(' ')[0]}</span>
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-tighter leading-none mt-0.5">{user?.role}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden lg:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl border-border shadow-2xl p-2">
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex flex-col">
                  <p className="text-sm font-bold">{user?.fullname}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="sm:hidden grid grid-cols-3 gap-1 mb-2">
                <DropdownMenuItem onClick={() => {}} className="justify-center h-10 rounded-xl bg-surface">
                  <ThemeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/chat')} className="justify-center h-10 rounded-xl bg-surface relative">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  {unreadCount > 0 && <span className="absolute top-1 right-3 h-2 w-2 bg-primary rounded-full" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.preventDefault()} className="justify-center h-10 rounded-xl bg-surface p-0">
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
                <span>Ayuda</span>
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

      {/* Search expansion (<xl) */}
      {mobileSearchOpen && (
        <div className="xl:hidden px-2 sm:px-3 pb-2 animate-in slide-in-from-top-2 duration-200">
          <GlobalSearchBar fullWidth />
        </div>
      )}
    </header>
  );
};

export default Header;
