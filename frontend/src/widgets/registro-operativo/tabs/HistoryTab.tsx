import { useMemo, useState } from 'react';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { HistoryRecord } from '../types';

interface HistoryTabProps {
  records: HistoryRecord[];
  loading: boolean;
  errored?: boolean;
}

type FilterKey = 'all' | HistoryRecord['type'];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '📋 Todo' },
  { key: 'milking', label: '🥛 Ordeño' },
  { key: 'treatment', label: '💉 Tratamiento' },
  { key: 'disease', label: '🤒 Enfermedad' },
  { key: 'control', label: '⚖️ Control' },
  { key: 'transfer', label: '🛣️ Traslado' },
  { key: 'finance', label: '💰 Finanzas' },
];

const BADGES: Record<HistoryRecord['type'], string> = {
  milking: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  transfer: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  disease: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200',
  finance: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200',
  control: 'bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-200',
  treatment: 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200',
};

const LABELS: Record<HistoryRecord['type'], string> = {
  milking: '🥛 Ordeño',
  transfer: '🛣️ Traslado',
  disease: '🤒 Enfermedad',
  finance: '💰 Finanzas',
  control: '⚖️ Control',
  treatment: '💉 Tratamiento',
};

const PAGE_SIZE = 50;

function formatRecordDate(value?: string): string {
  if (!value) return 'Sin fecha';
  const day = String(value).split('T')[0];
  if (day === getTodayColombia()) return 'Hoy';
  try {
    return new Date(day + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return day; }
}

export function HistoryTab({ records, loading, errored = false }: HistoryTabProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const map = new Map<FilterKey, number>([['all', records.length]]);
    records.forEach(r => map.set(r.type, (map.get(r.type) ?? 0) + 1));
    return map;
  }, [records]);

  const filtered = useMemo(
    () => (filter === 'all' ? records : records.filter(r => r.type === filter)),
    [records, filter],
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (errored) {
    return (
      <div className="text-center py-12 space-y-2">
        <span className="text-4xl" aria-hidden="true">⚠️</span>
        <p className="text-muted-foreground font-medium">No se pudo cargar el historial</p>
        <p className="text-sm text-muted-foreground">Revise la conexión y toque «Actualizar todo» abajo.</p>
      </div>
    );
  }

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => {
          const count = counts.get(f.key) ?? 0;
          if (f.key !== 'all' && count === 0) return null;
          return (
            <button key={f.key} type="button" onClick={() => { setFilter(f.key); setVisible(PAGE_SIZE); }} aria-pressed={filter === f.key}
              className={`min-h-10 px-3 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'}`}>
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <span className="text-4xl" aria-hidden="true">📊</span>
          <p className="text-muted-foreground font-medium">
            {records.length === 0 ? 'Todavía no hay registros' : 'Ningún registro de este tipo'}
          </p>
          <p className="text-sm text-muted-foreground">
            {records.length === 0
              ? 'Lo que registre en Agricultura y Ganadería aparece aquí.'
              : 'Cambie el filtro para ver los demás movimientos.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Mostrando {shown.length} de {filtered.length} registros
          </p>
          <div className="space-y-3">
            {shown.map(r => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" style={{ overflowWrap: 'break-word' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGES[r.type]}`}>{LABELS[r.type]}</span>
                      {r.animalLabel && <span className="text-xs text-muted-foreground">{r.animalLabel}</span>}
                    </div>
                    <p className="text-sm mt-1 text-foreground">{r.details}</p>
                    {r.notes && <p className="text-xs mt-0.5 text-muted-foreground italic">{r.notes}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">{formatRecordDate(r.date)}</span>
                </div>
              </div>
            ))}
          </div>
          {visible < filtered.length && (
            <button type="button" onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="w-full min-h-11 rounded-lg border border-border bg-card text-sm font-semibold text-primary hover:border-primary transition-colors">
              Ver {Math.min(PAGE_SIZE, filtered.length - visible)} más
            </button>
          )}
        </>
      )}
    </div>
  );
}
