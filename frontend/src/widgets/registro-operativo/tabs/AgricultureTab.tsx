import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { CropActivity } from '@/entities/campesino';
import type { ActivityConfig } from '../types';

const ACTIVITY_TYPES: ActivityConfig[] = [
  { value: 'sowing', label: 'Siembra', emoji: '', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  { value: 'irrigation', label: 'Riego', emoji: '💧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  { value: 'fertilization', label: 'Fertilización', emoji: '🧪', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  { value: 'pest_control', label: 'Control Plagas', emoji: '🐛', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  { value: 'harvest', label: 'Cosecha', emoji: '', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  { value: 'note', label: 'Nota/Observación', emoji: '📋', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-700' },
];

function getActivityCfg(type: string) {
  return ACTIVITY_TYPES.find(t => t.value === type) ?? ACTIVITY_TYPES[5];
}

function groupByDate(activities: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  activities.forEach(a => {
    const key = a.activity_date ? a.activity_date.split('T')[0] : 'sin-fecha';
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return groups;
}

function formatGroupDate(dateStr: string): string {
  if (dateStr === 'sin-fecha') return 'Sin fecha';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const dDate = new Date(d); dDate.setHours(0, 0, 0, 0);
    if (dDate.getTime() === today.getTime()) return '📅 Hoy';
    if (dDate.getTime() === yesterday.getTime()) return ' Ayer';
    return ' ' + d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

interface AgricultureTabProps {
  activities: CropActivity[];
  loading: boolean;
  onQuickAction: (type: string) => void;
  onDelete: (id: number) => void;
}

export function AgricultureTab({ activities, loading, onQuickAction, onDelete }: AgricultureTabProps) {
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

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">¿Qué hizo hoy?</p>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_TYPES.map(type => (
            <motion.button key={type.value} whileTap={{ scale: 0.94 }} onClick={() => onQuickAction(type.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 ${type.border} ${type.color} transition-all hover:shadow-sm`}>
              <span className="text-2xl">{type.emoji}</span>
              <span className="text-[11px] font-semibold leading-tight text-center">{type.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Buscar por descripción o insumo..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterType === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card text-muted-foreground border-border'}`}>
          📋 Todas
        </button>
        {ACTIVITY_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilterType(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterType === t.value ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card text-muted-foreground border-border'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <span className="text-5xl">📋</span>
          <p className="text-muted-foreground font-medium">No hay labores registradas</p>
          <p className="text-sm text-muted-foreground">Toca uno de los botones arriba para registrar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateKeys.map(dateKey => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold text-muted-foreground capitalize whitespace-nowrap">{formatGroupDate(dateKey)}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="relative pl-5">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-3">
                  {grouped[dateKey].map((activity: any, i: number) => {
                    const cfg = getActivityCfg(activity.activity_type || 'note');
                    const cost = (activity as any).cost;
                    const inputName = (activity as any).input_name;
                    const plotName = (activity as any).crop_plot?.name || (activity as any).crop_plot?.crop_name;
                    return (
                      <motion.div key={activity.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                        <div className={`absolute -left-3 top-4 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center text-[10px] ${cfg.color}`}>{cfg.emoji}</div>
                        <div className={`ml-2 rounded-lg border ${cfg.border} ${cfg.color} p-3`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{cfg.emoji} {cfg.label}</span>
                                {plotName && <span className="text-[11px] opacity-70 truncate">· {plotName}</span>}
                              </div>
                              {activity.description && <p className="text-xs mt-1 opacity-80 line-clamp-2">{activity.description}</p>}
                              {(inputName || cost) && (
                                <div className="flex gap-3 mt-1.5 text-[11px] font-medium opacity-75">
                                  {inputName && <span>📦 {inputName} {(activity as any).quantity ? `· ${(activity as any).quantity} ${(activity as any).unit || ''}` : ''}</span>}
                                  {cost && <span>💰 ${Number(cost).toLocaleString('es-CO')}</span>}
                                </div>
                              )}
                            </div>
                            <button onClick={() => onDelete(activity.id!)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-current hover:text-red-600 opacity-50 hover:opacity-100 transition-all shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
