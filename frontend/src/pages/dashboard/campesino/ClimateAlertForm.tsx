import type { Dispatch, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';

type FormData = {
  title: string;
  risk_type: string;
  severity: string;
  description: string;
  recommendation: string;
  valid_from: string;
  valid_until: string;
  source: string;
  is_active: boolean;
};
type RiskType = { value: string; emoji: string; label: string };
type SeverityConfig = Record<string, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  indicator: string;
}>;

interface ClimateAlertFormProps {
  showForm: boolean;
  setShowForm: (open: boolean) => void;
  editId: number | null;
  form: FormData;
  setForm: Dispatch<SetStateAction<FormData>>;
  saving: boolean;
  riskTypes: RiskType[];
  severityConfig: SeverityConfig;
  handleSave: () => void | Promise<void>;
}

export function ClimateAlertForm({
  showForm, setShowForm, editId, form, setForm, saving, riskTypes, severityConfig, handleSave,
}: ClimateAlertFormProps) {
  return (
    <>
      {/* ── Modal de Creación / Edición de Alerta Local ──────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="vl-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="vl-modal-surface w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  {editId ? '✏️ Editar Alerta de Riesgo' : '⛈️ Registrar Nueva Alerta de Riesgo'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Título de la Alerta *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Helada prevista en potrero La Esperanza"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Tipo de Riesgo *
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {riskTypes.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, risk_type: r.value }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                          form.risk_type === r.value
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span className="text-xl">{r.emoji}</span>
                        <span className="fit-clamp">{r.label}</span>
                      </button>
                    ))}
                  </div>
                  {form.risk_type === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Especifique el tipo de riesgo..."
                      value={form.risk_type === 'Otro' ? '' : form.risk_type}
                      onChange={e => setForm(f => ({ ...f, risk_type: e.target.value }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Nivel de Severidad *
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(severityConfig).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, severity: key }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                          form.severity === key
                            ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span className="text-xl">{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Descripción del Fenómeno
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre lo observado o previsto (temperatura estimada, potreros afectados)..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    💡 ¿Qué debe hacer el campesino / operario?
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Encender aspersores a las 4 am, mover terneros al establo o vigilar drenajes..."
                    value={form.recommendation}
                    onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      📅 Válida Desde
                    </label>
                    <input
                      type="datetime-local"
                      value={form.valid_from}
                      onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      📅 Válida Hasta
                    </label>
                    <input
                      type="datetime-local"
                      value={form.valid_until}
                      onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Fuente de la Información
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Observación directa, IDEAM, Asociación de Ganaderos"
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                    form.is_active
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <span className="font-semibold text-sm">¿Alerta activa actualmente?</span>
                  <span className="text-xl">{form.is_active ? '✅ Activa' : '❌ Inactiva'}</span>
                </button>
              </div>

              <div className="px-5 pb-5">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 text-base font-bold shadow-md shadow-orange-500/20"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando alerta...
                    </>
                  ) : (
                    '✅ Guardar y Publicar Alerta'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
