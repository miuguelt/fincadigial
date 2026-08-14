import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { campesinoServices, CropPlot } from '@/entities/campesino';
import { fieldService } from '@/entities/field/api/field.service';
import { Button } from '@/shared/ui/button';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import {
  Plus, Search, Sprout, Calendar, MapPin,
  X, Loader2, RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; border: string; bg: string }> = {
  planned:   { label: 'Planificada', emoji: '🟡', color: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-300 dark:border-amber-700',  bg: 'bg-amber-50 dark:bg-amber-950/30' },
  active:    { label: 'Activa',      emoji: '🟢', color: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  harvested: { label: 'Cosechada',   emoji: '🔵', color: 'text-blue-700 dark:text-blue-300',     border: 'border-blue-300 dark:border-blue-700',    bg: 'bg-blue-50 dark:bg-blue-950/30' },
  lost:      { label: 'Perdida',     emoji: '🔴', color: 'text-red-700 dark:text-red-300',       border: 'border-red-300 dark:border-red-700',      bg: 'bg-red-50 dark:bg-red-950/30' },
};

const CROP_EMOJIS: Record<string, string> = {
  maiz: '🌽', maíz: '🌽', yuca: '🥔', cafe: '☕', café: '☕',
  pasto: '🌿', platano: '🍌', plátano: '🍌', tomate: '🍅',
  papa: '🥔', frijol: '🫘', fríjol: '🫘', caña: '🎋', arroz: '🌾',
  cacao: '🍫', aguacate: '🥑', mora: '🍇', limon: '🍋', limón: '🍋',
};

function getCropEmoji(cropName?: string): string {
  if (!cropName) return '🌱';
  const lower = cropName.toLowerCase();
  for (const [key, emoji] of Object.entries(CROP_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌾';
}

function getDaysToHarvest(dateStr?: string): { days: number; label: string; urgent: boolean } | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { days: diff, label: `Hace ${Math.abs(diff)} días`, urgent: true };
  if (diff === 0) return { days: 0, label: '¡Hoy!', urgent: true };
  return { days: diff, label: `En ${diff} días`, urgent: diff <= 7 };
}

// ── Tipos de formulario ──────────────────────────────────────────────────────

type FormStep = 1 | 2 | 3;
interface FormData {
  name: string;
  crop_name: string;
  variety: string;
  area: string;
  area_unit: string;
  field_id: string;
  sowing_date: string;
  expected_harvest_date: string;
  status: string;
  seed_source: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  name: '', crop_name: '', variety: '', area: '', area_unit: 'ha',
  field_id: '', sowing_date: '', expected_harvest_date: '',
  status: 'active', seed_source: '', notes: '',
};

// ── Componente principal ─────────────────────────────────────────────────────

const CropPlotsPage: React.FC = () => {
  const { showToast } = useToast();
  const [plots, setPlots] = useState<CropPlot[]>([]);
  const [fields, setFields] = useState<{ label: string; value: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<FormStep>(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plotsData, fieldsData] = await Promise.all([
        campesinoServices.cropPlots.getAll({ limit: 100 }),
        fieldService.getAll().catch(() => []),
      ]);
      setPlots(Array.isArray(plotsData) ? plotsData : (plotsData as any)?.data ?? []);
      setFields((fieldsData as any[]).map((f: any) => ({
        label: f.name || f.nombre || `Potrero #${f.id}`,
        value: f.id,
      })));
    } catch {
      showToast('Error cargando parcelas', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(INITIAL_FORM); setEditId(null); setStep(1); setShowForm(true); };
  const openEdit = (plot: CropPlot) => {
    setForm({
      name: plot.name || '', crop_name: (plot as any).crop_name || '',
      variety: (plot as any).variety || '', area: String((plot as any).area || ''),
      area_unit: (plot as any).area_unit || 'ha', field_id: String((plot as any).field_id || ''),
      sowing_date: (plot as any).sowing_date || '', expected_harvest_date: (plot as any).expected_harvest_date || '',
      status: plot.status || 'active', seed_source: (plot as any).seed_source || '',
      notes: (plot as any).notes || '',
    });
    setEditId(plot.id ?? null);
    setStep(1); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.crop_name) { showToast('Ingresa el nombre y el cultivo', 'error'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form, area: form.area ? parseFloat(form.area) : undefined, field_id: form.field_id ? parseInt(form.field_id) : undefined };
      if (editId) {
        await campesinoServices.cropPlots.update(editId, payload);
        showToast('Parcela actualizada ✅', 'success');
      } else {
        await campesinoServices.cropPlots.create(payload);
        showToast('Parcela creada ✅', 'success');
      }
      setShowForm(false);
      load();
    } catch {
      showToast('Error guardando la parcela', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta parcela?')) return;
    try {
      await campesinoServices.cropPlots.delete(id);
      showToast('Parcela eliminada', 'success');
      load();
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const filtered = plots.filter(p => {
    const term = search.toLowerCase();
    const matchSearch = !term || p.name?.toLowerCase().includes(term) || (p as any).crop_name?.toLowerCase().includes(term);
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/10 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              🌱 Parcelas y Cultivos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plots.length} parcela{plots.length !== 1 ? 's' : ''} registrada{plots.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shadow-md shadow-emerald-200 dark:shadow-emerald-950">
            <Plus className="w-4 h-4" /> Nueva
          </Button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o cultivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        {/* Filtros de estado */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'all', label: 'Todas', emoji: '🌿' },
            { key: 'active', label: 'Activas', emoji: '🟢' },
            { key: 'planned', label: 'Planificadas', emoji: '🟡' },
            { key: 'harvested', label: 'Cosechadas', emoji: '🔵' },
            { key: 'lost', label: 'Perdidas', emoji: '🔴' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                filterStatus === f.key
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:border-emerald-400'
              }`}
            >
              <span>{f.emoji}</span> {f.label}
            </button>
          ))}
        </div>

        {/* Lista de parcelas */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <span className="text-5xl">🌱</span>
            <p className="text-muted-foreground font-medium">No hay parcelas registradas</p>
            <p className="text-sm text-muted-foreground">Toca "Nueva" para agregar tu primer cultivo</p>
            <Button onClick={openNew} variant="outline" className="mt-2 border-emerald-400 text-emerald-700 dark:text-emerald-300">
              <Plus className="w-4 h-4 mr-2" /> Agregar Parcela
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((plot, i) => {
              const statusCfg = STATUS_CONFIG[plot.status || 'active'] ?? STATUS_CONFIG.active;
              const cropEmoji = getCropEmoji((plot as any).crop_name);
              const harvest = getDaysToHarvest((plot as any).expected_harvest_date);
              const areaVal = (plot as any).area;
              const areaUnit = (plot as any).area_unit || 'ha';

              return (
                <motion.div
                  key={plot.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-lg border-2 ${statusCfg.border} ${statusCfg.bg} p-4 cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => openEdit(plot)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-white/70 dark:bg-white/10 flex items-center justify-center text-3xl shadow-sm shrink-0">
                      {cropEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground text-base leading-tight fit-clamp">{plot.name}</h3>
                          <p className={`text-sm font-medium mt-0.5 ${statusCfg.color}`}>
                            {(plot as any).crop_name || 'Sin cultivo especificado'}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border} shrink-0`}>
                          {statusCfg.emoji} {statusCfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-muted-foreground">
                        {areaVal && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {areaVal} {areaUnit}
                          </span>
                        )}
                        {(plot as any).sowing_date && (
                          <span className="flex items-center gap-1">
                            <Sprout className="w-3 h-3" /> Siembra: {formatDateColombia((plot as any).sowing_date)}
                          </span>
                        )}
                        {harvest && (
                          <span className={`flex items-center gap-1 font-semibold ${harvest.urgent ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                            {harvest.urgent ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                            Cosecha: {harvest.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(plot.id!); }}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Botón actualizar */}
        {!loading && (
          <button onClick={load} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar lista
          </button>
        )}
      </div>

      {/* ── MODAL: Formulario de parcela ──────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="vl-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="vl-modal-surface w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 text-foreground shadow-2xl"
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <div>
                  <h2 className="font-bold text-lg">{editId ? '✏️ Editar Parcela' : '🌱 Nueva Parcela'}</h2>
                  <p className="text-xs text-muted-foreground">Paso {step} de 3</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Indicador de pasos */}
              <div className="flex gap-1 px-5 pt-4">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? 'bg-emerald-500' : 'bg-muted'}`} />
                ))}
              </div>

              <div className="p-5 space-y-4">
                {/* PASO 1: Lo básico */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">¿Cómo se llama y qué cultiva?</p>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Nombre de la Parcela *</label>
                      <input
                        type="text" placeholder="Ej: Lote Norte, La Cañada, Parcela 1"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">¿Qué cultiva? *</label>
                      <input
                        type="text" placeholder="Ej: Maíz, Yuca, Café, Pasto"
                        value={form.crop_name} onChange={e => setForm(f => ({ ...f, crop_name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                      {form.crop_name && (
                        <div className="mt-2 text-center text-3xl">{getCropEmoji(form.crop_name)}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Variedad (opcional)</label>
                      <input
                        type="text" placeholder="Ej: ICA V-105, Criolla amarilla"
                        value={form.variety} onChange={e => setForm(f => ({ ...f, variety: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  </motion.div>
                )}

                {/* PASO 2: Tamaño y fechas */}
                {step === 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">¿Cuánto mide y cuándo la sembró?</p>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-foreground mb-1.5">Área</label>
                        <input
                          type="number" min="0" step="0.01" placeholder="0"
                          value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </div>
                      <div className="w-36">
                        <label className="block text-sm font-medium text-foreground mb-1.5">Unidad</label>
                        <select
                          value={form.area_unit} onChange={e => setForm(f => ({ ...f, area_unit: e.target.value }))}
                          className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <option value="ha">Hectáreas</option>
                          <option value="m2">Metros²</option>
                          <option value="fanegada">Fanegadas</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha de Siembra</label>
                      <input
                        type="date" value={form.sowing_date}
                        onChange={e => setForm(f => ({ ...f, sowing_date: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">🌾 Fecha Estimada de Cosecha</label>
                      <input
                        type="date" value={form.expected_harvest_date}
                        onChange={e => setForm(f => ({ ...f, expected_harvest_date: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    {fields.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Potrero Asociado (opcional)</label>
                        <select
                          value={form.field_id} onChange={e => setForm(f => ({ ...f, field_id: e.target.value }))}
                          className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <option value="">Sin potrero</option>
                          {fields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* PASO 3: Estado y notas */}
                {step === 3 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">¿En qué estado está?</p>

                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => setForm(f => ({ ...f, status: key }))}
                          className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                            form.status === key ? `${cfg.border} ${cfg.bg} ${cfg.color}` : 'border-border bg-background text-muted-foreground'
                          }`}
                        >
                          {cfg.emoji} {cfg.label}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Observaciones</label>
                      <textarea
                        rows={3} placeholder="Algo importante que quieras anotar..."
                        value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Botones de navegación */}
              <div className="flex gap-3 px-5 pb-5">
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(s => (s - 1) as FormStep)} className="flex-1 rounded-xl">
                    Atrás
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    onClick={() => {
                      if (step === 1 && (!form.name || !form.crop_name)) {
                        showToast('Ingresa el nombre y el cultivo', 'error');
                        return;
                      }
                      setStep(s => (s + 1) as FormStep);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    Siguiente →
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : '✅ Guardar Parcela'}
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CropPlotsPage;
