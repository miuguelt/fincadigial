import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { campesinoServices, WaterSource } from '@/entities/campesino';
import { Button } from '@/shared/ui/button';
import { Plus, X, Loader2, RefreshCw, Search, Droplets } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';

const SOURCE_TYPES = [
  { value: 'stream',       label: 'Quebrada/Río', emoji: '🏞️', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  { value: 'well',         label: 'Pozo',         emoji: '🪣', color: 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300', border: 'border-stone-300 dark:border-stone-600' },
  { value: 'reservoir',    label: 'Reservorio',   emoji: '💦', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',   border: 'border-cyan-300 dark:border-cyan-700' },
  { value: 'rainwater',    label: 'Agua Lluvia',  emoji: '🌧️', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  { value: 'public_supply',label: 'Acueducto',   emoji: '🚰', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  { value: 'other',        label: 'Otro',         emoji: '💧', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',   border: 'border-gray-300 dark:border-gray-700' },
];

const RELIABILITY_CFG: Record<string, { label: string; color: string }> = {
  high:     { label: 'Alta', color: 'text-green-600 dark:text-green-400' },
  medium:   { label: 'Media', color: 'text-amber-600 dark:text-amber-400' },
  low:      { label: 'Baja', color: 'text-red-600 dark:text-red-400' },
  seasonal: { label: 'Estacional', color: 'text-blue-600 dark:text-blue-400' },
};

function getSourceCfg(type: string) {
  return SOURCE_TYPES.find(t => t.value === type) ?? SOURCE_TYPES[5];
}

interface FormData {
  name: string; source_type: string; capacity_liters: string;
  is_potable: boolean; reliability: string; notes: string;
}

const INITIAL_FORM: FormData = {
  name: '', source_type: 'other', capacity_liters: '',
  is_potable: false, reliability: '', notes: '',
};

const WaterSourcesPage: React.FC = () => {
  const { showToast } = useToast();
  const [sources, setSources] = useState<WaterSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await campesinoServices.waterSources.getAll({ limit: 100 });
      setSources(Array.isArray(data) ? data : (data as any)?.data ?? []);
    } catch { showToast('Error cargando fuentes de agua', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(INITIAL_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (s: WaterSource) => {
    setForm({
      name: s.name || '', source_type: (s as any).source_type || 'other',
      capacity_liters: String((s as any).capacity_liters || ''),
      is_potable: (s as any).is_potable || false,
      reliability: (s as any).reliability || '', notes: (s as any).notes || '',
    });
    setEditId((s as any).id ?? null); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { showToast('Ingresa el nombre de la fuente', 'error'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form, capacity_liters: form.capacity_liters ? parseFloat(form.capacity_liters) : undefined };
      if (editId) { await campesinoServices.waterSources.update(editId, payload); showToast('Fuente actualizada ✅', 'success'); }
      else { await campesinoServices.waterSources.create(payload); showToast('Fuente registrada ✅', 'success'); }
      setShowForm(false); load();
    } catch { showToast('Error guardando', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta fuente de agua?')) return;
    try { await campesinoServices.waterSources.delete(id); showToast('Fuente eliminada', 'success'); load(); }
    catch { showToast('Error al eliminar', 'error'); }
  };

  const filtered = sources.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/40 to-background dark:from-cyan-950/10 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">💧 Fuentes de Agua</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{sources.length} fuente{sources.length !== 1 ? 's' : ''} registrada{sources.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openNew} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl gap-1.5 shadow-md shadow-cyan-200 dark:shadow-cyan-950">
            <Plus className="w-4 h-4" /> Nueva
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar fuente..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <span className="text-5xl">💧</span>
            <p className="text-muted-foreground font-medium">No hay fuentes de agua registradas</p>
            <Button onClick={openNew} variant="outline" className="border-cyan-400 text-cyan-700 dark:text-cyan-300">
              <Plus className="w-4 h-4 mr-2" /> Agregar fuente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((source, i) => {
              const s = source as any;
              const cfg = getSourceCfg(s.source_type);
              const relCfg = s.reliability ? RELIABILITY_CFG[s.reliability] : null;
              const capacityPct = s.capacity_liters ? Math.min(100, Math.round((s.current_level_liters ?? s.capacity_liters) / s.capacity_liters * 100)) : null;

              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`rounded-lg border-2 ${cfg.border} ${cfg.color} p-4 cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => openEdit(source)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center text-3xl shrink-0 shadow-sm">
                      {cfg.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base text-foreground">{s.name}</h3>
                          <p className="text-xs opacity-75 mt-0.5">{cfg.label}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.is_potable ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {s.is_potable ? '✅ Potable' : '⚠️ No potable'}
                          </span>
                          {relCfg && <span className={`text-xs font-semibold ${relCfg.color}`}>Confiabilidad: {relCfg.label}</span>}
                        </div>
                      </div>

                      {s.capacity_liters && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="flex items-center gap-1 opacity-75"><Droplets className="w-3 h-3" /> Capacidad</span>
                            <span className="font-bold">{Number(s.capacity_liters).toLocaleString('es-CO')} L</span>
                          </div>
                          {capacityPct !== null && (
                            <div className="h-2 bg-white/40 dark:bg-black/20 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full transition-all" style={{ width: `${capacityPct}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                      {s.notes && <p className="text-xs opacity-70 mt-2 line-clamp-1">{s.notes}</p>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-current hover:text-red-600 opacity-50 hover:opacity-100 transition-all shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {!loading && <button onClick={load} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className="w-4 h-4" /> Actualizar</button>}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="bg-card rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <h2 className="font-bold text-lg">{editId ? '✏️ Editar Fuente' : '💧 Nueva Fuente de Agua'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nombre *</label>
                  <input type="text" placeholder="Ej: Quebrada La Honda, Pozo Norte"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Tipo de fuente</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SOURCE_TYPES.map(t => (
                      <button key={t.value} onClick={() => setForm(f => ({ ...f, source_type: t.value }))}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${form.source_type === t.value ? `${t.border} ${t.color}` : 'border-border bg-background text-muted-foreground'}`}
                      >
                        <span className="text-xl">{t.emoji}</span>{t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Capacidad estimada (litros)</label>
                  <input type="number" min="0" step="100" placeholder="0"
                    value={form.capacity_liters} onChange={e => setForm(f => ({ ...f, capacity_liters: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                </div>

                {/* ¿Es potable? */}
                <button onClick={() => setForm(f => ({ ...f, is_potable: !f.is_potable }))}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${form.is_potable ? 'border-green-400 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300' : 'border-border bg-background text-muted-foreground'}`}
                >
                  <span className="font-medium text-sm">¿El agua es potable?</span>
                  <span className="text-2xl">{form.is_potable ? '✅' : '❌'}</span>
                </button>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confiabilidad</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'high', label: 'Alta', emoji: '🟢' },
                      { value: 'medium', label: 'Media', emoji: '🟡' },
                      { value: 'low', label: 'Baja', emoji: '🔴' },
                      { value: 'seasonal', label: 'Estacional', emoji: '🔵' },
                    ].map(r => (
                      <button key={r.value} onClick={() => setForm(f => ({ ...f, reliability: r.value }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${form.reliability === r.value ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300' : 'border-border bg-background text-muted-foreground'}`}
                      >
                        <span>{r.emoji}</span>{r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Observaciones</label>
                  <textarea rows={2} placeholder="Notas sobre acceso, estado, uso..."
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none"
                  />
                </div>
              </div>
              <div className="px-5 pb-5">
                <Button onClick={handleSave} disabled={saving} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl py-3 text-base font-bold">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Fuente'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WaterSourcesPage;
