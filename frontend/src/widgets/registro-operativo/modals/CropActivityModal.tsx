import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { campesinoServices } from '@/entities/campesino';
import { useToast } from '@/app/providers/ToastContext';
import type { CropFormData, ActivityConfig } from '../types';

const ACTIVITY_TYPES: ActivityConfig[] = [
  { value: 'sowing', label: 'Siembra', emoji: '🌱', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  { value: 'irrigation', label: 'Riego', emoji: '💧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  { value: 'fertilization', label: 'Fertilización', emoji: '🧪', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  { value: 'pest_control', label: 'Control Plagas', emoji: '🐛', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  { value: 'harvest', label: 'Cosecha', emoji: '🌾', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  { value: 'note', label: 'Nota/Observación', emoji: '📋', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-700' },
];

interface CropActivityModalProps {
  open: boolean;
  onClose: () => void;
  initialForm: CropFormData;
  plots: { label: string; value: any }[];
  onSave: () => void;
}

export function CropActivityModal({ open, onClose, initialForm, plots, onSave }: CropActivityModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<CropFormData>(initialForm);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(initialForm);
      setShowDetails(false);
    }
  }, [open, initialForm]);

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
      onSave();
      onClose();
    } catch {
      showToast('Error guardando la labor', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1100] bg-overlay-strong flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-bold text-lg">Registrar Labor</h2>
              <button onClick={onClose} className="icon-btn" aria-label="Cerrar ventana"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">¿Qué hice?</p>
                <div className="grid grid-cols-3 gap-2">
                  {ACTIVITY_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, activity_type: t.value }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-xs font-semibold ${form.activity_type === t.value ? `${t.border} ${t.color}` : 'border-border bg-background text-muted-foreground'}`}>
                      <span className="text-xl">{t.emoji}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">📅 ¿Cuándo?</label>
                <input type="date" value={form.activity_date} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              {plots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5"> ¿En qué parcela?</label>
                  <select value={form.crop_plot_id} onChange={e => setForm(f => ({ ...f, crop_plot_id: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                    <option value="">Sin parcela específica</option>
                    {plots.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">¿Qué hizo exactamente?</label>
                <textarea rows={2} placeholder="Ej: Rié el cultivo de maíz por 2 horas..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
              </div>
              <button onClick={() => setShowDetails(v => !v)} className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span>+ Agregar insumos y costo (opcional)</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showDetails && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">📦 Insumo utilizado</label>
                      <input type="text" placeholder="Ej: Urea, Herbicida, Semilla" value={form.input_name}
                        onChange={e => setForm(f => ({ ...f, input_name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-foreground mb-1.5">Cantidad</label>
                        <input type="number" min="0" step="0.01" placeholder="0" value={form.quantity}
                          onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-foreground mb-1.5">Unidad</label>
                        <input type="text" placeholder="kg, litros, bultos" value={form.unit}
                          onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">💰 Costo ($)</label>
                      <input type="number" min="0" step="100" placeholder="0" value={form.cost}
                        onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="px-5 pb-5">
              <Button onClick={handleSave} disabled={saving} className="w-full py-3 text-base">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : '✅ Guardar Labor'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
