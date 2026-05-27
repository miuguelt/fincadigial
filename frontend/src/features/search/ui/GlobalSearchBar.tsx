import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, RefreshCw, X } from 'lucide-react';
import { cn } from '@/shared/ui/cn.ts';
import { Badge } from '@/shared/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useSemanticSearch } from '@/features/search/hooks/useSemanticSearch';

interface GlobalSearchBarProps {
  onClose?: () => void;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  onClose,
  autoFocus = false,
  className,
  placeholder = "Buscar animales, registros...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { query, setQuery, results, allResults, loading, error, clear } = useSemanticSearch({ debounceMs: 200 });
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  /* Foco automático */
  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [autoFocus]);

  /* Calcula la posición del dropdown relativa al wrapper */
  const updateDropdownPosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 340),
      zIndex: 9999,
    });
  }, []);

  /* Recalcula si cambia el tamaño de la ventana */
  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  /* Cerrar con Escape */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  /* Cerrar con Ctrl+K o Ctrl+B (en Colombia se usa más Ctrl+K como estándar digital) */
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        handleOpen();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    updateDropdownPosition();
  };

  const handleClose = () => {
    setIsOpen(false);
    clear();
    onClose?.();
  };

  const showDropdown = isOpen && (query.trim().length >= 2 || loading);

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 cursor-text',
          'bg-muted/40 hover:bg-muted/60 border-transparent hover:border-primary/20',
          isOpen && 'ring-2 ring-primary/30 bg-background border-primary/40 shadow-lg shadow-primary/5'
        )}
        onClick={handleOpen}
      >
        <Search
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-colors',
            isOpen ? 'text-primary' : 'text-muted-foreground'
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleOpen}
          placeholder={placeholder}
          className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full placeholder:text-muted-foreground/50 font-medium min-w-0"
        />
        {query && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="flex-shrink-0 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        {!isOpen && !query && (
          <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60 flex-shrink-0">
            Ctrl+K
          </kbd>
        )}
      </div>

      {/* Overlay para cerrar al hacer click fuera */}
      {showDropdown && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={handleClose}
            aria-hidden="true"
          />
          <div
            style={{ ...dropdownStyle, animation: 'searchDropdownIn 0.2s ease-out' }}
            className="bg-card/98 backdrop-blur-2xl border border-border/60 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="max-h-[420px] overflow-y-auto overscroll-contain">
              {loading && (
                <div className="p-8 text-center">
                  <RefreshCw className="h-5 w-5 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Buscando...</p>
                </div>
              )}

              {!loading && error && (
                <div className="p-10 text-center">
                  <p className="text-3xl mb-2">⚠️</p>
                  <p className="text-sm text-destructive font-medium">{error}</p>
                  <p className="text-xs text-muted-foreground mt-1">Intenta de nuevo o verifica tu conexión</p>
                </div>
              )}

              {!loading && !error && allResults.length === 0 && query.length >= 2 && (
                <div className="p-10 text-center">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-sm text-muted-foreground">
                    Sin resultados para{' '}
                    <span className="font-bold text-foreground">"{query}"</span>
                  </p>
                </div>
              )}

              {/* Resultados Agrupados */}
              {!loading && !error && (
                <>
                  {/* Categoría: Animales */}
                  {results.animals.length > 0 && (
                    <div className="py-2">
                      <div className="px-5 py-2 flex items-center gap-2">
                         <div className="h-px flex-1 bg-border/40" />
                         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Animales</span>
                         <div className="h-px flex-1 bg-border/40" />
                      </div>
                      {results.animals.map((item) => (
                        <SearchResultItem key={`animal-${item.id}`} result={item} onSelect={handleClose} navigate={navigate} />
                      ))}
                    </div>
                  )}

                  {/* Categoría: Registros y otros */}
                  {results.records.length > 0 && (
                    <div className="py-2">
                      <div className="px-5 py-2 flex items-center gap-2">
                         <div className="h-px flex-1 bg-border/40" />
                         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Registros</span>
                         <div className="h-px flex-1 bg-border/40" />
                      </div>
                      {results.records.map((item) => (
                        <SearchResultItem key={`record-${item.id}`} result={item} onSelect={handleClose} navigate={navigate} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-2.5 bg-muted/30 border-t border-border/40 flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                Buscando en la finca...
              </p>
              <kbd className="text-[10px] text-muted-foreground/60 font-mono border border-border/50 rounded px-1">ESC</kbd>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

/* Sub-componente para cada item de resultado */
const SearchResultItem: React.FC<{ result: any, onSelect: () => void, navigate: any }> = ({ result, onSelect, navigate }) => (
    <button
        onClick={() => {
            navigate(result.url);
            onSelect();
        }}
        className="w-full px-5 py-3.5 text-left hover:bg-primary/5 active:bg-primary/10 transition-colors flex items-start gap-3 border-b border-border/10 last:border-0 group/item"
    >
        <div className="mt-0.5 p-1.5 rounded-xl bg-muted group-hover/item:bg-primary/10 transition-colors flex-shrink-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground group-hover/item:text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-foreground truncate">
                    {result.name || result.title}
                </span>
                <Badge
                    variant="secondary"
                    className="text-[8px] uppercase tracking-tighter bg-muted text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary flex-shrink-0"
                >
                    {result.type}
                </Badge>
            </div>
            {result.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {result.description}
                </p>
            )}
        </div>
    </button>
);
