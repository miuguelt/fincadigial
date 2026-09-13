import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { HistoryRecord } from '../types';
import { RECORD_KINDS, RECORD_CHIP_CLASS, RECORD_TILE_CLASS } from '../record-kinds';
import { formatRecordDate } from './dateGrouping';
import { FilterChips, type FilterChipItem } from '../components/FilterChips';
import { ListEmpty, ListError, ListSkeleton } from '../components/ListStates';
import { HistoryRecordDetailModal } from '../components/HistoryRecordDetailModal';

interface HistoryTabProps {
  records: HistoryRecord[];
  loading: boolean;
  errored?: boolean;
  onRetry?: () => void;
}

type FilterKey = 'all' | HistoryRecord['type'];

const PAGE_SIZE = 50;

export function HistoryTab({ records, loading, errored = false, onRetry }: HistoryTabProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  const counts = useMemo(() => {
    const map = new Map<FilterKey, number>([['all', records.length]]);
    records.forEach(r => map.set(r.type, (map.get(r.type) ?? 0) + 1));
    return map;
  }, [records]);

  const filterItems: FilterChipItem[] = useMemo(() => {
    const order: HistoryRecord['type'][] = ['milking', 'treatment', 'disease', 'control', 'transfer', 'finance'];
    return order
      .filter(key => (counts.get(key) ?? 0) > 0)
      .map(key => ({
        key,
        label: `${RECORD_KINDS[key].emoji} ${RECORD_KINDS[key].label}`,
        count: counts.get(key) ?? 0,
      }));
  }, [counts]);

  const filtered = useMemo(
    () => (filter === 'all' ? records : records.filter(r => r.type === filter)),
    [records, filter],
  );

  if (loading) return <ListSkeleton />;

  if (errored) {
    return (
      <ListError
        title="No se pudo cargar el historial"
        hint="Revise la conexión e intente de nuevo."
        onRetry={onRetry}
      />
    );
  }

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <FilterChips
        ariaLabel="Filtrar historial por tipo"
        items={[{ key: 'all', label: '📋 Todo', count: counts.get('all') ?? 0 }, ...filterItems]}
        active={filter}
        onChange={key => { setFilter(key as FilterKey); setVisible(PAGE_SIZE); }}
      />

      {filtered.length === 0 ? (
        <ListEmpty
          emoji="📊"
          title={records.length === 0 ? 'Todavía no hay registros' : 'Ningún registro de este tipo'}
          hint={records.length === 0
            ? 'Lo que registre en Agricultura y Ganadería aparece aquí.'
            : 'Cambie el filtro para ver los demás movimientos.'}
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Mostrando {shown.length} de {filtered.length} registros
          </p>
          <div className="space-y-3">
            {shown.map(r => {
              const kind = RECORD_KINDS[r.type];
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`${RECORD_TILE_CLASS} group hover:bg-muted/20`}
                  aria-label={`Ver detalle de ${kind.label}: ${r.details}`}
                  title="Abrir detalle completo"
                  onClick={() => setSelectedRecord(r)}
                >
                  <span className={`${RECORD_CHIP_CLASS} ${kind.chip}`} aria-hidden="true">{kind.emoji}</span>
                  <div className="flex-1 min-w-0" style={{ overflowWrap: 'break-word' }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{kind.label}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">{formatRecordDate(r.date)}</span>
                    </div>
                    {r.animalLabel && <p className="text-xs text-muted-foreground">{r.animalLabel}</p>}
                    <p className="text-sm mt-1 text-foreground">{r.details}</p>
                    {r.notes && <p className="text-xs mt-0.5 text-muted-foreground italic">{r.notes}</p>}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              );
            })}
          </div>
          {visible < filtered.length && (
            <button type="button" onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="w-full min-h-11 rounded-lg border border-border bg-card text-sm font-semibold text-primary hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
              Ver {Math.min(PAGE_SIZE, filtered.length - visible)} más
            </button>
          )}
        </>
      )}

      <HistoryRecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}
