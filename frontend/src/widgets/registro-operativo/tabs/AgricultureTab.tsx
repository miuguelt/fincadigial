import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { CropActivity } from '@/entities/campesino';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { ACTIVITY_TYPES, getActivityCfg } from '../constants';
import { RECORD_CHIP_CLASS } from '../record-kinds';

function groupByDate(activities: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  activities.forEach(a => {
    const key = a.activity_date ? String(a.activity_date).split('T')[0] : 'sin-fecha';
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return groups;
}

function yesterdayColombia(): string {
  const [y, m, d] = getTodayColombia().split('-').map(Number);
  const ref = new Date(Date.UTC(y, m - 1, d));
  ref.setUTCDate(ref.getUTCDate() - 1);
  return ref.toISOString().split('T')[0];
}

function formatGroupDate(dateStr: string): string {
  if (dateStr === 'sin-fecha') return 'Sin fecha';
  if (dateStr === getTodayColombia()) return '📅 Hoy';
  if (dateStr === yesterdayColombia()) return '🕐 Ayer';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return '📆 ' + d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

interface AgricultureTabProps {
  activities: CropActivity[];
  loading: boolean;
  errored?: boolean;
  onQuickAction: (type: string) => void;
  onDelete: (id: number) => void;
}

export function AgricultureTab({ activities, loading, errored = false, onQuickAction, onDelete }: AgricultureTabProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = activities.filter(a => {
    const term = search.toLowerCase();
    const matchSearch = !term || (a.description || '').toLowerCase().includes(term) || ((a as any).input_name || '').toLowerCase().includes(term);
    const matchType = filterType === 'all' || a.activity_type === filterType;
    return matchSearch && matchType;
  });

  const grouped = groupByDate(filtered);
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const isFiltering = Boolean(search) || filterType !== 'all';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="vl-section-title">¿Qué hizo hoy?</p>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_TYPES.map(type => (
            <motion.button key={type.value} whileTap={{ scale: 0.94 }} type="button" onClick={() => onQuickAction(type.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onQuickAction(type.value);
                }
              }}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 min-h-20 rounded-lg border ${type.border} ${type.color} transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}>
              <span className="text-2xl" aria-hidden="true">{type.emoji}</span>
              <span className="text-[11px] font-semibold leading-tight text-center" style={{ overflowWrap: 'break-word' }}>{type.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <input type="search" placeholder="Buscar por descripción o insumo..." value={search} onChange={e => setSearch(e.target.value)}
          aria-label="Buscar labores registradas"
          className="w-full min-h-11 pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button type="button" onClick={() => setFilterType('all')} aria-pressed={filterType === 'all'}
          className={`min-h-10 px-3 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ${filterType === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'}`}>
          📋 Todas
        </button>
        {ACTIVITY_TYPES.map(t => (
          <button key={t.value} type="button" onClick={() => setFilterType(t.value)} aria-pressed={filterType === t.value}
            className={`min-h-10 px-3 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ${filterType === t.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : errored ? (
        <div className="text-center py-16 space-y-3">
          <span className="text-5xl" aria-hidden="true">⚠️</span>
          <p className="text-muted-foreground font-medium">No se pudieron cargar las labores</p>
          <p className="text-sm text-muted-foreground">Revise la conexión y toque «Actualizar todo» abajo.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <span className="text-5xl" aria-hidden="true">📋</span>
          <p className="text-muted-foreground font-medium">
            {isFiltering ? 'Ninguna labor coincide con el filtro' : 'Todavía no hay labores registradas'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isFiltering ? 'Pruebe con otra búsqueda o quite el filtro.' : 'Toque uno de los botones de arriba para registrar la primera.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            {filtered.length === activities.length
              ? `${activities.length} labores registradas`
              : `${filtered.length} de ${activities.length} labores`}
          </p>
          {dateKeys.map(dateKey => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold text-muted-foreground capitalize whitespace-nowrap">{formatGroupDate(dateKey)}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {grouped[dateKey].map((activity: any, i: number) => {
                  const cfg = getActivityCfg(activity.activity_type);
                  const cost = activity.cost;
                  const inputName = activity.input_name;
                  const plotName = activity.crop_plot?.name || activity.crop_plot?.crop_name;
                  return (
                    <motion.div key={activity.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
                      <span className={`${RECORD_CHIP_CLASS} ${cfg.color}`} aria-hidden="true">{cfg.emoji}</span>
                      <div className="flex-1 min-w-0" style={{ overflowWrap: 'break-word' }}>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">{cfg.label}</span>
                          {plotName && <span className="text-xs text-muted-foreground">{plotName}</span>}
                        </div>
                        {activity.description && <p className="text-sm mt-1 text-foreground">{activity.description}</p>}
                        {(inputName || cost) && (
                          <div className="flex gap-3 flex-wrap mt-1 text-xs text-muted-foreground">
                            {inputName && <span>📦 {inputName}{activity.quantity ? ` · ${Number(activity.quantity).toLocaleString('es-CO')} ${activity.unit || ''}` : ''}</span>}
                            {cost != null && cost !== '' && <span>💰 ${Number(cost).toLocaleString('es-CO')}</span>}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => onDelete(activity.id!)} aria-label={`Eliminar la labor de ${cfg.label}`}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
