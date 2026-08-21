/**
 * Una fila del buscador: qué es, cómo se llama y los datos que permiten
 * reconocerlo sin abrirlo (arete, raza, especie, fecha).
 */
import { Clock } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';
import type { SearchResult } from '@/features/search/api/semanticSearch.service';
import { normalizeColombianLivestockText } from '@/shared/utils/colombiaLanguage';
import { FALLBACK_TYPE_STYLE, TYPE_CONFIG } from '../model/searchCatalog';
import { HighlightMatch } from './HighlightMatch';

interface Props {
  result: SearchResult;
  query: string;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function SearchResultRow({ result, query, index, isSelected, onSelect }: Props) {
  const config = TYPE_CONFIG[result.type] ?? { ...FALLBACK_TYPE_STYLE, label: result.type };
  const Icon = config.icon;
  const title = normalizeColombianLivestockText(result.name || result.title || `Elemento #${result.id}`);
  const description = result.description ? normalizeColombianLivestockText(result.description) : undefined;

  return (
    <button
      type="button"
      data-search-index={index}
      onClick={onSelect}
      aria-current={isSelected || undefined}
      className={cn(
        'group/item flex w-full items-start gap-3.5 px-4 py-3 text-left transition-colors',
        isSelected
          ? 'border-l-4 border-primary bg-primary/10 pl-3.5 text-foreground'
          : 'border-l-4 border-transparent hover:bg-muted/50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 shrink-0 rounded-xl p-2 transition-transform group-hover/item:scale-105',
          config.colorClass,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <HighlightMatch
            text={title}
            query={query}
            className="block fit-clamp text-sm font-semibold text-foreground"
          />
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0 text-[11px] font-bold uppercase tracking-tight',
              config.badgeVariant,
            )}
          >
            {config.label}
          </Badge>
        </span>

        {description && (
          <HighlightMatch
            text={description}
            query={query}
            className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground"
          />
        )}

        <span className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/80">
          {result.internal_id && (
            <span className="rounded bg-muted/60 px-1 font-mono">ID: {result.internal_id}</span>
          )}
          {result.breed && <span className="fit-clamp min-w-0">{normalizeColombianLivestockText(result.breed)}</span>}
          {result.species && <span className="fit-clamp min-w-0 capitalize">{normalizeColombianLivestockText(result.species)}</span>}
          {result.date && (
            <span className="ml-auto inline-flex items-center gap-1 font-mono">
              <Clock className="h-3 w-3 opacity-60" />
              {result.date}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default SearchResultRow;
