import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { campesinoServices, ClimateRiskAlert } from '@/entities/campesino';
import { Button } from '@/shared/ui/button';
import { Plus, X, Loader2, RefreshCw, Search, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { formatDateColombia } from '@/shared/utils/dateUtils';

const SEVERITY_CFG = {
  low:      { label: 'Baja',    emoji: '🟢', color: 'text-green-700 dark:text-green-300',  bg: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-300 dark:border-green-700',  indicator: 'bg-green-500' },
  medium:   { label: 'Media',   emoji: '🟡', color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-300 dark:border-amber-700',  indicator: 'bg-amber-500' },
  high:     { label: 'Alta',    emoji: '🟠', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', indicator: 'bg-orange-500' },
  critical: { label: 'Crítica', emoji: '🔴', color: 'text-red-700 dark:text-red-300',      bg: 'bg-red-50 dark:bg-red-950/30',      border: 'border-red-400 dark:border-red-700',       indicator: 'bg-red-600' },
} as const;

const RISK_TYPES = [
  { value: 'Helada', emoji: '🥶', label: 'Helada' },
  { value: 'Sequía', emoji: '☀️', label: 'Sequía' },
  { value: 'Inundación', emoji: '🌊', label: 'Inundación' },
  { value: 'Plaga', emoji: '🐛', label: 'Plaga' },
  { value: 'Viento fuerte', emoji: '💨', label: 'Viento Fuerte' },
  { value: 'Granizo', emoji: '🧊', label: 'Granizo' },
  { value: 'Otro', emoji: '⚠️', label: 'Otro' },
];

function getRiskEmoji(riskType?: string): string {
  if (!riskType) return '⚠️';
  const found = RISK_TYPES.find(r => riskType.toLowerCase().includes(r.value.toLowerCase()));
  return found?.emoji ?? '⚠️';
}

function getDaysLeft(dateStr?: string): string | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Vencida';
  if (diff === 0) return 'Vence hoy';
  return `Vence en ${diff} día${diff !== 1 ? 's' : ''}`;
}

type SeverityKey = keyof typeof SEVERITY_CFG;

interface FormData {
  title: string; risk_type: string; severity: string;
  description: string; recommendation: string;
  valid_from: string; valid_until: string;
  source: string; is_active: boolean;
}

const INITIAL_FORM: FormData = {
  title: '', risk_type: '', severity: 'medium',
  description: '', recommendation: '',
  valid_from: '', valid_until: '', source: 'Observación local', is_active: true,
};

const ClimateAlertsPage: React.FC = () => {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<ClimateRiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await campesinoServices.climateRisks.getAll({ limit: 100 });
      const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
      // Ordenar: activas primero, luego por severidad
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      list.sort((a: any, b: any) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
      });
      setAlerts(list);
    } catch { showToast('Error cargando alertas', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(INITIAL_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (a: ClimateRiskAlert) => {
    const al = a as any;
    setForm({
      title: al.title || '', risk_type: al.risk_type || '',
      severity: al.severity || 'medium', description: al.description || '',
      recommendation: al.recommendation || '',
      valid_from: al.valid_from?.slice(0, 16) || '',
      valid_until: al.valid_until?.slice(0, 16) || '',
      source: al.source || 'Observación local', is_active: al.is_active ?? true,
    });
    setEditId(al.id ?? null); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.risk_type) { showToast('Ingresa el título y el tipo de riesgo', 'error'); return; }
    setSaving(true);
    try {
      if (editId) { await campesinoServices.climateRisks.update(editId, form as any); showToast('Alerta actualizada ✅', 'success'); }
      else { await campesinoServices.climateRisks.create(form as any); showToast('Alerta creada ✅', 'success'); }
      setShowForm(false); load();
    } catch { showToast('Error guardando la alerta', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta alerta?')) return;
    try { await campesinoServices.climateRisks.delete(id); showToast('Alerta eliminada', 'success'); load(); }
    catch { showToast('Error al eliminar', 'error'); }
  };

  const filtered = alerts.filter(a => {
    const al = a as any;
    const term = search.toLowerCase();
    const matchSearch = !term || (al.title || '').toLowerCase().includes(term) || (al.risk_type || '').toLowerCase().includes(term);
    const matchSev = filterSeverity === 'all' || al.severity === filterSeverity;
    return matchSearch && matchSev;
  });

  const activeAlerts = filtered.filter(a => (a as any).is_active);
  const inactiveAlerts = filtered.filter(a => !(a as any).is_active);

  const renderAlert = (alert: ClimateRiskAlert, i: number) => {
    const a = alert as any;
    const cfg = SEVERITY_CFG[a.severity as SeverityKey] ?? SEVERITY_CFG.medium;
    const emoji = getRiskEmoji(a.risk_type);
    const daysLeft = getDaysLeft(a.valid_until);
    const isExpanded = expandedId === a.id;

    return (
      <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
        className={`rounded-lg border-2 ${cfg.border} overflow-hidden ${!a.is_active ? 'opacity-60' : ''}`}
      >
        {/* Indicador de severidad */}
        <div className={`h-1.5 ${cfg.indicator}`} />

        <div className={`${cfg.bg} p-4`}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center text-2xl shrink-0 shadow-sm">
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 ${cfg.color}`}>
                      {cfg.emoji} Severidad {cfg.label}
                    </span>
                    {!a.is_active && <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Inactiva</span>}
                  </div>
                  <h3 className={`font-bold text-base mt-1 ${cfg.color}`}>{a.title}</h3>
                  <p className={`text-xs mt-0.5 opacity-75 ${cfg.color}`}>{a.risk_type}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    className={`p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/10 transition-colors ${cfg.color} opacity-70 hover:opacity-100`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(alert)}
                    className={`p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/10 transition-colors ${cfg.color} opacity-70 hover:opacity-100`}
                  >
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-all opacity-50 hover:opacity-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fechas */}
              {daysLeft && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${daysLeft === 'Vencida' ? 'text-muted-foreground' : cfg.color}`}>
                  <Clock className="w-3 h-3" /> {daysLeft}
                  {a.valid_until && <span className="opacity-60 font-normal">· hasta {formatDateColombia(a.valid_until)}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Detalles expandibles */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={`mt-3 pt-3 border-t ${cfg.border} space-y-2`}>
                  {a.description && (
                    <div>
                      <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>📝 Descripción</p>
                      <p className={`text-sm ${cfg.color} opacity-80`}>{a.description}</p>
                    </div>
                  )}
                  {a.recommendation && (
                    <div className="bg-white/50 dark:bg-white/5 rounded-xl p-3">
                      <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>💡 ¿Qué hacer?</p>
                      <p className={`text-sm ${cfg.color} opacity-90 font-medium`}>{a.recommendation}</p>
                    </div>
                  )}
                  {a.source && <p className={`text-xs ${cfg.color} opacity-60`}>Fuente: {a.source}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 to-background dark:from-orange-950/10 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">⛈️ Alertas Climáticas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{activeAlerts.length} alerta{activeAlerts.length !== 1 ? 's' : ''} activa{activeAlerts.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openNew} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-1.5 shadow-md shadow-orange-200 dark:shadow-orange-950">
            <Plus className="w-4 h-4" /> Nueva
          </Button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar alerta..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
        </div>

        {/* Filtros de severidad */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setFilterSeverity('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${filterSeverity === 'all' ? 'bg-orange-600 text-white border-orange-600' : 'bg-card text-muted-foreground border-border'}`}
          >
            ⚠️ Todas
          </button>
          {Object.entries(SEVERITY_CFG).map(([key, cfg]) => (
            <button key={key} onClick={() => setFilterSeverity(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${filterSeverity === key ? 'bg-orange-600 text-white border-orange-600' : 'bg-card text-muted-foreground border-border'}`}
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <span className="text-5xl">⛅</span>
            <p className="text-muted-foreground font-medium">No hay alertas registradas</p>
            <Button onClick={openNew} variant="outline" className="border-orange-400 text-orange-700 dark:text-orange-300">
              <Plus className="w-4 h-4 mr-2" /> Crear alerta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAlerts.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🚨 Alertas Activas</p>
                {activeAlerts.map((a, i) => renderAlert(a, i))}
              </div>
            )}
            {inactiveAlerts.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">📁 Historial</p>
                {inactiveAlerts.map((a, i) => renderAlert(a, i))}
              </div>
            )}
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
              className="bg-card rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <h2 className="font-bold text-lg">{editId ? '✏️ Editar Alerta' : '⛈️ Nueva Alerta'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Título *</label>
                  <input type="text" placeholder="Ej: Helada prevista esta noche"
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Tipo de riesgo *</p>
                  <div className="grid grid-cols-4 gap-2">
                    {RISK_TYPES.map(r => (
                      <button key={r.value} onClick={() => setForm(f => ({ ...f, risk_type: r.value }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${form.risk_type === r.value ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300' : 'border-border bg-background text-muted-foreground'}`}
                      >
                        <span className="text-xl">{r.emoji}</span>{r.label}
                      </button>
                    ))}
                  </div>
                  {/* Campo de texto por si no está en la lista */}
                  {form.risk_type === 'Otro' && (
                    <input type="text" placeholder="Especifique el tipo de riesgo"
                      value={form.risk_type === 'Otro' ? '' : form.risk_type}
                      onChange={e => setForm(f => ({ ...f, risk_type: e.target.value }))}
                      className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">¿Qué tan grave es?</p>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(SEVERITY_CFG).map(([key, cfg]) => (
                      <button key={key} onClick={() => setForm(f => ({ ...f, severity: key }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${form.severity === key ? `${cfg.border} ${cfg.bg} ${cfg.color}` : 'border-border bg-background text-muted-foreground'}`}
                      >
                        <span className="text-xl">{cfg.emoji}</span>{cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Descripción</label>
                  <textarea rows={2} placeholder="Detalles sobre el riesgo..."
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">💡 ¿Qué debe hacer el campesino?</label>
                  <textarea rows={2} placeholder="Acciones recomendadas para proteger los cultivos..."
                    value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1.5">📅 Desde</label>
                    <input type="datetime-local" value={form.valid_from}
                      onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                      className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1.5">📅 Hasta</label>
                    <input type="datetime-local" value={form.valid_until}
                      onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                      className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                </div>

                <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${form.is_active ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300' : 'border-border bg-background text-muted-foreground'}`}
                >
                  <span className="font-medium text-sm">¿Alerta activa?</span>
                  <span className="text-2xl">{form.is_active ? '✅' : '❌'}</span>
                </button>
              </div>
              <div className="px-5 pb-5">
                <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 text-base font-bold">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Alerta'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClimateAlertsPage;
