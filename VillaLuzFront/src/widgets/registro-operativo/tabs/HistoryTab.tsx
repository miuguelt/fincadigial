import type { HistoryRecord } from '../types';

interface HistoryTabProps {
  records: HistoryRecord[];
  loading: boolean;
}

export function HistoryTab({ records, loading }: HistoryTabProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <span className="text-4xl">📊</span>
        <p className="text-muted-foreground font-medium">No hay registros aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.slice(0, 50).map(r => {
        const badgeStyles =
          r.type === 'milking' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
          r.type === 'transfer' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
          r.type === 'disease' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
        const activityLabel =
          r.type === 'milking' ? '🥛 Ordeño' :
          r.type === 'transfer' ? '🛣️ Traslado' :
          r.type === 'disease' ? ' Enfermedad' : '💉 Tratamiento';
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeStyles}`}>{activityLabel}</span>
                  <span className="text-xs text-muted-foreground">{r.animalLabel}</span>
                </div>
                <p className="text-xs mt-1 text-foreground">{r.details}</p>
                {r.notes && <p className="text-xs mt-0.5 text-muted-foreground italic">{r.notes}</p>}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{r.date}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
