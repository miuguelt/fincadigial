/**
 * Marco del desplegable: la barra de categorías de arriba y el pie con los
 * atajos de teclado. Ninguno decide nada, sólo muestran el estado que reciben.
 */
import { cn } from '@/shared/ui/cn';
import type { SearchCategory } from '@/features/search/hooks/useSemanticSearch';

export interface CategoryOption {
  id: SearchCategory;
  label: string;
  count: number;
}

interface CategoryFilterProps {
  categories: CategoryOption[];
  active: SearchCategory;
  onSelect: (category: SearchCategory) => void;
}

export function SearchCategoryFilter({ categories, active, onSelect }: CategoryFilterProps) {
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-border/40 bg-muted/20 px-3 pb-2 pt-2.5">
      {categories
        .filter((category) => category.id === 'all' || category.count > 0)
        .map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-pressed={active === category.id}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
              active === category.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span>{category.label}</span>
            <span
              className={cn(
                'rounded-full px-1 font-mono text-[11px]',
                active === category.id
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-background/80 text-muted-foreground',
              )}
            >
              {category.count}
            </span>
          </button>
        ))}
    </div>
  );
}

const Key = ({ children }: { children: string }) => (
  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px]">
    {children}
  </kbd>
);

export function SearchFooter({ resultCount }: { resultCount: number }) {
  return (
    <div className="flex items-center justify-between border-t border-border/40 bg-muted/40 px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Navegar con</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Key>↑</Key>
          <Key>↓</Key>
          <Key>↵</Key>
        </span>
        {resultCount > 0 && (
          <span className="ml-1 font-semibold text-foreground">
            {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span>Cerrar con</span>
        <Key>ESC</Key>
      </div>
    </div>
  );
}
