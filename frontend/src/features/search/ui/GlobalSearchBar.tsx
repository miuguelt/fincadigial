/**
 * Buscador global de la finca.
 *
 * Este archivo sólo arma la pieza: el campo de texto, el desplegable en un
 * portal y qué estado mostrar dentro. La mecánica del desplegable vive en
 * `useSearchDropdown`, el catálogo de tipos y accesos en `searchCatalog`, y
 * cada estado en su propio componente.
 */
import { useEffect, useMemo, type FC } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, X } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { useSemanticSearch } from '@/features/search/hooks/useSemanticSearch';
import { MIN_SEARCH_QUERY_LENGTH } from '../model/searchConstants';
import { useSearchDropdown } from '../model/useSearchDropdown';
import { SearchCategoryFilter, SearchFooter, type CategoryOption } from './SearchChrome';
import {
  SearchEmptyState,
  SearchErrorState,
  SearchLoadingState,
  SearchShortcutsState,
  SearchTooShortState,
} from './SearchDropdownStates';
import { SearchResultRow } from './SearchResultRow';

interface GlobalSearchBarProps {
  onClose?: () => void;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}

/** Por encima del campo (1050) pero por debajo del encabezado, que no debe opacarse. */
const BACKDROP_Z_INDEX = 990;

export const GlobalSearchBar: FC<GlobalSearchBarProps> = ({
  onClose,
  autoFocus = false,
  className,
  placeholder = 'Buscar animales, potreros, tratamientos...',
}) => {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    activeCategory,
    setActiveCategory,
    results,
    allResults,
    filteredResults,
    loading,
    error,
    clear,
    retry,
  } = useSemanticSearch({ debounceMs: 120, minQueryLength: MIN_SEARCH_QUERY_LENGTH });

  const dropdown = useSearchDropdown({
    resultUrlAt: (index) => (index >= 0 ? filteredResults[index]?.url : undefined),
    resultCount: filteredResults.length,
    resetSelectionKey: `${activeCategory}:${filteredResults.length}`,
    onNavigate: navigate,
    onClear: clear,
    onClose,
  });

  /* El buscador puede montarse dentro de un panel que todavía está animando:
     enfocar en el mismo tick pierde el foco cuando la animación termina. */
  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => dropdown.inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [autoFocus, dropdown.inputRef]);

  const categories: CategoryOption[] = useMemo(
    () => [
      { id: 'all', label: 'Todos', count: allResults.length },
      { id: 'animals', label: 'Animales', count: results.animals?.length || 0 },
      { id: 'fields', label: 'Potreros', count: results.fields?.length || 0 },
      { id: 'records', label: 'Salud', count: results.records?.length || 0 },
      { id: 'supplies', label: 'Insumos', count: results.supplies?.length || 0 },
      { id: 'tasks', label: 'Tareas', count: results.tasks?.length || 0 },
    ],
    [allResults, results],
  );

  const hasQuery = query.trim().length >= MIN_SEARCH_QUERY_LENGTH;
  const hasText = query.trim().length > 0;
  const showCategories = hasQuery && !loading && !error && allResults.length > 0;

  return (
    <div ref={dropdown.wrapperRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'relative flex cursor-text items-center gap-2.5 rounded-xl border px-3.5 py-2 transition-all duration-200',
          'border-border/50 bg-muted/40 hover:border-primary/40 hover:bg-muted/60',
          dropdown.isOpen &&
            'z-10 border-primary bg-background shadow-md shadow-primary/10 ring-2 ring-primary/40',
        )}
        onClick={dropdown.open}
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />
        ) : (
          <Search
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              dropdown.isOpen ? 'text-primary' : 'text-muted-foreground',
            )}
          />
        )}

        <input
          ref={dropdown.inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!dropdown.isOpen) dropdown.open();
          }}
          onFocus={dropdown.open}
          onKeyDown={dropdown.handleKeyDown}
          placeholder={placeholder}
          className="w-full min-w-0 border-none bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-0"
          aria-label="Buscador global de la finca"
          autoComplete="off"
          spellCheck="false"
        />

        {query && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              clear();
              dropdown.inputRef.current?.focus();
            }}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {!dropdown.isOpen && !query && (
          <kbd className="hidden h-5 shrink-0 items-center gap-1 rounded border border-border bg-muted/60 px-1.5 font-mono text-[11px] font-medium text-muted-foreground/70 sm:inline-flex">
            Ctrl+K
          </kbd>
        )}
      </div>

      {dropdown.isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-black/45"
              style={{ zIndex: BACKDROP_Z_INDEX }}
              onClick={dropdown.close}
              aria-hidden="true"
            />

            <div
              ref={dropdown.dropdownRef}
              style={dropdown.dropdownStyle}
              className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/98 shadow-2xl backdrop-blur-2xl transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              {showCategories && (
                <SearchCategoryFilter
                  categories={categories}
                  active={activeCategory}
                  onSelect={setActiveCategory}
                />
              )}

              <div
                ref={dropdown.resultsContainerRef}
                className="flex-1 divide-y divide-border/20 overflow-y-auto overscroll-contain"
              >
                {loading && <SearchLoadingState />}
                {!loading && error && <SearchErrorState error={error} onRetry={retry} />}
                {!loading && !error && !hasText && (
                  <SearchShortcutsState onNavigate={dropdown.navigate} />
                )}
                {!loading && !error && hasText && !hasQuery && <SearchTooShortState />}
                {!loading && !error && hasQuery && filteredResults.length === 0 && (
                  <SearchEmptyState query={query} />
                )}
                {!loading && !error && filteredResults.length > 0 && (
                  <div className="py-1">
                    {filteredResults.map((item, index) => (
                      <SearchResultRow
                        key={`${item.type}-${item.id}`}
                        result={item}
                        query={query}
                        index={index}
                        isSelected={dropdown.selectedIndex === index}
                        onSelect={() => dropdown.navigate(item.url)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <SearchFooter resultCount={filteredResults.length} />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default GlobalSearchBar;
