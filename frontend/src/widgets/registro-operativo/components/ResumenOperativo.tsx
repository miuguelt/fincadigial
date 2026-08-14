import { useMemo } from 'react';
import type { HistoryRecord } from '../types';
import { buildResumenTiles } from './resumenOperativo.model';
import type { SummaryTile, TileKey } from './resumenOperativo.model';

interface ResumenOperativoProps {
  records: HistoryRecord[];
  cropActivities: { activity_date?: string }[];
  loading: boolean;
  variant?: 'grid' | 'sidebar';
  onAction?: (key: TileKey) => void;
}

interface SummaryTileViewProps {
  tile: SummaryTile;
  onAction?: (key: TileKey) => void;
}

function SummaryTileView({ tile, onAction }: SummaryTileViewProps) {
  return (
    <div className={`rounded-xl border p-3 ${tile.tone}`}>
      <p className="text-xs font-semibold flex items-center gap-1.5">
        <span aria-hidden="true">{tile.emoji}</span>
        <span>{tile.label}</span>
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums" style={{ overflowWrap: 'break-word' }}>{tile.value}</p>
      <p className="mt-0.5 text-[11px] opacity-80">{tile.detail}</p>
      {onAction && (
        <button type="button" onClick={() => onAction(tile.key)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onAction(tile.key);
            }
          }}
          className="mt-2 min-h-8 rounded-md px-2 text-left text-[11px] font-bold underline decoration-current/30 underline-offset-2 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">
          {tile.actionLabel} →
        </button>
      )}
    </div>
  );
}

export function ResumenOperativo({ records, cropActivities, loading, variant = 'grid', onAction }: ResumenOperativoProps) {
  const tiles = useMemo(() => buildResumenTiles(records, cropActivities), [records, cropActivities]);
  const columns = variant === 'sidebar' ? 'xl:grid-cols-1' : 'lg:grid-cols-4';

  if (loading) {
    return (
      <div className={`grid grid-cols-2 gap-3 ${columns}`} aria-hidden="true">
        {[1, 2, 3, 4].map(key => <div key={key} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <section aria-label="Resumen de la finca" className={`grid grid-cols-2 gap-3 ${columns}`}>
      {tiles.map(tile => <SummaryTileView key={tile.key} tile={tile} onAction={onAction} />)}
    </section>
  );
}
