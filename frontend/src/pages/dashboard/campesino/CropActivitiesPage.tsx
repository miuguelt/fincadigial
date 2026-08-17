import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { campesinoServices, CropActivity } from '@/entities/campesino';
import { cropPlotsService } from '@/entities/campesino/api/campesino.service';
import { Button } from '@/shared/ui/button';

import {
  Plus, X, Loader2, RefreshCw, Search,
  Droplets, Sprout, Wheat, Bug, FileText, ChevronDown,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';

// ── Config de tipos de actividad ────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { value: 'sowing',       label: 'Siembra',         emoji: '🌱', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', border: 'border-green-300 dark:border-green-700', icon: Sprout },
  { value: 'irrigation',   label: 'Riego',           emoji: '💧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',   border: 'border-blue-300 dark:border-blue-700',  icon: Droplets },
  { value: 'fertilization',label: 'Fertilización',   emoji: '🧪', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', icon: null },
  { value: 'pest_control', label: 'Control Plagas',  emoji: '🐛', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',        border: 'border-red-300 dark:border-red-700',    icon: Bug },
  { value: 'harvest',      label: 'Cosecha',         emoji: '🌾', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700', icon: Wheat },
  { value: 'note',         label: 'Nota/Observación',emoji: '📋', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',    border: 'border-gray-300 dark:border-gray-700',  icon: FileText },
];

function getActivityCfg(type: string) {
  return ACTIVITY_TYPES.find(t => t.value === type) ?? ACTIVITY_TYPES[5];
}

function groupByDate(activities: CropActivity[]): Record<string, CropActivity[]> {
  const groups: Record<string, CropActivity[]> = {};
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
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    const dDate = new Date(d); dDate.setHours(0,0,0,0);
    if (dDate.getTime() === today.getTime()) return '📅 Hoy';
    if (dDate.getTime() === yesterday.getTime()) return '📅 Ayer';
    return '📅 ' + d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

interface FormData {
  crop_plot_id: string;
  activity_type: string;
  activity_date: string;
  description: string;
  input_name: string;
  quantity: string;
  unit: string;
  cost: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  crop_plot_id: '',
  activity_type: 'note',
  activity_date: new Date().toISOString().split('T')[0],
  description: '',
  input_name: '',
  quantity: '',
  unit: '',
  cost: '',
  notes: '',
};

// ── Componente principal ─────────────────────────────────────────────────────

const CropActivitiesPage: React.FC = () => {
  const { showToast } = useToast();
  const [activities, setActivities] = useState<CropActivity[]>([]);
  const [plots, setPlots] = useState<{ label: string; value: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [actData, plotData] = await Promise.all([
        campesinoServices.cropActivities.getAll({ limit: 200 }),
        cropPlotsService.getAll({ limit: 100 }).catch(() => []),
      ]);
      const acts = Array.isArray(actData) ? actData : (actData as any)?.data ?? [];
      // Ordenar por fecha desc
      acts.sort((a: any, b: any) => new Date(b.activity_date || 0).getTime() - new Date(a.activity_date || 0).getTime());
      setActivities(acts);
      setPlots((plotData as any[]).map((p: any) => ({
        label: `${p.name || 'Parcela'} - ${p.crop_name || 'Sin cultivo'}`,
        value: p.id,
      })));
    } catch {
      showToast('Error cargando labores', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openQuick = (type: string) => {
    setForm({ ...INITIAL_FORM, activity_type: type });
    setShowDetails(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        crop_plot_id: form.crop_plot_id ? parseInt(form.crop_plot_id) : undefined,
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
      };
      await campesinoServices.cropActivities.create(payload);
      showToast('Labor registrada ✅', 'success');
      setShowForm(false);
      load();
    } catch {
      showToast('Error guardando la labor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await campesinoServices.cropActivities.delete(id);
      showToast('Registro eliminado', 'success');
      load();
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const filtered = activities.filter(a => {
    const term = search.toLowerCase();
    const matchSearch = !term || (a.description || '').toLowerCase().includes(term) || ((a as any).input_name || '').toLowerCase().includes(term);
    const matchType = filterType === 'all' || a.activity_type === filterType;
    return matchSearch && matchType;
  });

  const grouped = groupByDate(filtered);
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-background dark:from-blue-950/10 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              📋 Bitácora de Labores
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{activities.length} registro{activities.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => openQuick('note')} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shadow-md shadow-blue-200 dark:shadow-blue-950">
            <Plus className="w-4 h-4" /> Registrar
          </Button>
        </div>

        {/* ── REGISTRO RÁPIDO ─────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">¿Qué hizo hoy?</p>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_TYPES.map(type => (
              <motion.button
                key={type.value}
                whileTap={{ scale: 0.94 }}
                onClick={() => openQuick(type.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 ${type.border} ${type.color} transition-all hover:shadow-sm`}
              >
                <span className="text-2xl">{type.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight text-center">{type.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por descripción o insumo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Filtros por tipo */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterType === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-muted-foreground border-border'}`}
          >
            📋 Todas
          </button>
          {ACTIVITY_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${filterType === t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-muted-foreground border-border'}`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Lista tipo línea de tiempo */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
          </div>
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
                {/* Separador de fecha */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-bold text-muted-foreground capitalize whitespace-nowrap">
                    {formatGroupDate(dateKey)}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="relative pl-5">
                  {/* Línea vertical */}
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-3">
                    {grouped[dateKey].map((activity, i) => {
                      const cfg = getActivityCfg(activity.activity_type || 'note');
                      const cost = (activity as any).cost;
                      const inputName = (activity as any).input_name;
                      const plotName = (activity as any).crop_plot?.name || (activity as any).crop_plot?.crop_name;

                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="relative"
                        >
                          {/* Punto en la línea */}
                          <div className={`absolute -left-3 top-4 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center text-[11px] ${cfg.color}`}>
                            {cfg.emoji}
                          </div>

                          <div className={`ml-2 rounded-lg border ${cfg.border} ${cfg.color} p-3`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm">{cfg.emoji} {cfg.label}</span>
                                  {plotName && (
                                    <span className="text-[11px] opacity-70 fit-clamp">· {plotName}</span>
                                  )}
                                </div>
                                {activity.description && (
                                  <p className="text-xs mt-1 opacity-80 line-clamp-2">{activity.description}</p>
                                )}
                                {(inputName || cost) && (
                                  <div className="flex gap-3 mt-1.5 text-[11px] font-medium opacity-75">
                                    {inputName && <span>📦 {inputName} {(activity as any).quantity ? `· ${(activity as any).quantity} ${(activity as any).unit || ''}` : ''}</span>}
                                    {cost && <span>💰 ${Number(cost).toLocaleString('es-CO')}</span>}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleDelete(activity.id!)}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-current hover:text-red-600 opacity-50 hover:opacity-100 transition-all shrink-0"
                              >
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

        {!loading && (
          <button onClick={load} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        )}
      </div>

      {/* ── MODAL: Registrar labor ─────────────────────────────── */}
      <GenericModal
        isOpen={showForm}
        onOpenChange={(val) => !val && setShowForm(false)}
        title="Registrar Labor"
        size="md"
        themeColor="blue"
        enableBackdropBlur
      >
        <div className="space-y-4 pt-2">
          {/* Selector de tipo */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">¿Qué hice?</p>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, activity_type: t.value }))}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-xs font-semibold ${
                    form.activity_type === t.value ? `${t.border} ${t.color}` : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <span className="text-xl">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">📅 ¿Cuándo?</label>
            <input
              type="date" value={form.activity_date}
              onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Parcela */}
          {plots.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">🌱 ¿En qué parcela?</label>
              <select
                value={form.crop_plot_id}
                onChange={e => setForm(f => ({ ...f, crop_plot_id: e.target.value }))}
                className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">Sin parcela específica</option>
                {plots.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">¿Qué hizo exactamente?</label>
            <textarea
              rows={2}
              placeholder="Ej: Rié el cultivo de maíz por 2 horas..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>

          {/* Detalles adicionales (colapsable) */}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>+ Agregar insumos y costo (opcional)</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">📦 Insumo utilizado</label>
                  <input
                    type="text" placeholder="Ej: Urea, Herbicida, Semilla"
                    value={form.input_name}
                    onChange={e => setForm(f => ({ ...f, input_name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Cantidad</label>
                    <input
                      type="number" min="0" step="0.01" placeholder="0"
                      value={form.quantity}
                      onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Unidad</label>
                    <input
                      type="text" placeholder="kg, litros, bultos"
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">💰 Costo ($)</label>
                  <input
                    type="number" min="0" step="100" placeholder="0"
                    value={form.cost}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Si ingresa un costo, se creará un registro financiero automáticamente.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="pt-2 pb-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-base font-bold"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : '✅ Guardar Labor'}
            </Button>
          </div>
        </div>
      </GenericModal>
    </div>
  );
};

export default CropActivitiesPage;
