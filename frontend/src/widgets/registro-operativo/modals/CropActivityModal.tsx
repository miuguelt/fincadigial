import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { campesinoServices } from '@/entities/campesino';
import { useToast } from '@/app/providers/ToastContext';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { ACTIVITY_TYPES } from '../constants';
import type { CropFormData } from '../types';

interface CropActivityModalProps {
  open: boolean;
  onClose: () => void;
  initialForm: CropFormData;
  plots: { label: string; value: any }[];
  onSave: () => void;
}

const RING = 'focus:ring-emerald-500/30';

export function CropActivityModal({ open, onClose, initialForm, plots, onSave }: CropActivityModalProps) {
  const { showToast } = useToast();
  const { isOnline } = useOnlineStatus();
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
    if (form.activity_date > getTodayColombia()) {
      showToast('La fecha de la labor no puede ser futura', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        crop_plot_id: form.crop_plot_id ? parseInt(form.crop_plot_id) : undefined,
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
      };
      // Agricultura es la pestaña por defecto y se usa en el potrero: sin
      // encolado explícito la labor se perdía cuando no había cobertura.
      if (!isOnline) {
        await offlineQueue.enqueue('POST', 'crop-activities', payload);
        showToast('Guardado sin señal. Se sincroniza al recuperar cobertura.', 'success');
      } else {
        await campesinoServices.cropActivities.create(payload);
        showToast('Labor registrada ✅', 'success');
      }
      onSave();
      onClose();
    } catch {
      showToast('Error guardando la labor', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GenericModal
      isOpen={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Registrar Labor"
      description="Registra una labor agrícola y sus costos asociados."
      size="md"
      icon={null}
      bodyClassName="overflow-y-auto overscroll-contain p-0 focus:outline-none"
    >
      <div className="space-y-4 p-5">
              {!isOnline && (
                <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
                  📶 Sin señal. La labor queda guardada en el teléfono y sube sola cuando vuelva la cobertura.
                </p>
              )}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">¿Qué hice?</p>
                <div className="grid grid-cols-3 gap-2">
                  {ACTIVITY_TYPES.map(t => (
                    <button key={t.value} type="button" aria-pressed={form.activity_type === t.value} onClick={() => setForm(f => ({ ...f, activity_type: t.value }))}
                      className={`flex flex-col items-center gap-1 p-2.5 min-h-16 rounded-xl border-2 transition-all text-xs font-semibold ${form.activity_type === t.value ? `${t.border} ${t.color}` : 'border-border bg-background text-muted-foreground'}`}>
                      <span className="text-xl" aria-hidden="true">{t.emoji}</span>
                      <span className="text-center leading-tight" style={{ overflowWrap: 'break-word' }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="labor-fecha" className="block text-sm font-medium text-foreground mb-1.5">📅 ¿Cuándo?</label>
                <input id="labor-fecha" type="date" max={getTodayColombia()} value={form.activity_date} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))}
                  className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
              </div>
              {plots.length > 0 && (
                <div>
                  <label htmlFor="labor-parcela" className="block text-sm font-medium text-foreground mb-1.5">🌿 ¿En qué parcela?</label>
                  <select id="labor-parcela" value={form.crop_plot_id} onChange={e => setForm(f => ({ ...f, crop_plot_id: e.target.value }))}
                    className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}>
                    <option value="">Sin parcela específica</option>
                    {plots.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="labor-descripcion" className="block text-sm font-medium text-foreground mb-1.5">¿Qué hizo exactamente?</label>
                <textarea id="labor-descripcion" rows={2} placeholder="Ej: regué el cultivo de maíz por 2 horas..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING} resize-none`} />
              </div>
              <button type="button" onClick={() => setShowDetails(v => !v)} aria-expanded={showDetails} className="w-full flex items-center justify-between py-2 min-h-11 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span>+ Agregar insumos y costo (opcional)</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              <AnimatePresence>
                {showDetails && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                    <div>
                      <label htmlFor="labor-insumo" className="block text-sm font-medium text-foreground mb-1.5">📦 Insumo utilizado</label>
                      <input id="labor-insumo" type="text" placeholder="Ej: Urea, Herbicida, Semilla" value={form.input_name}
                        onChange={e => setForm(f => ({ ...f, input_name: e.target.value }))}
                        className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label htmlFor="labor-cantidad" className="block text-sm font-medium text-foreground mb-1.5">Cantidad</label>
                        <input id="labor-cantidad" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={form.quantity}
                          onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                          className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="labor-unidad" className="block text-sm font-medium text-foreground mb-1.5">Unidad</label>
                        <input id="labor-unidad" type="text" placeholder="kg, litros, bultos" value={form.unit}
                          onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                          className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="labor-costo" className="block text-sm font-medium text-foreground mb-1.5">💰 Costo</label>
                      <input id="labor-costo" type="number" inputMode="numeric" min="0" step="100" placeholder="0" value={form.cost}
                        onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                        className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm tabular-nums focus:outline-none focus:ring-2 ${RING}`} />
                      {Number(form.cost) > 0 && (
                        <p className="mt-1.5 text-sm font-semibold text-foreground tabular-nums" aria-live="polite">
                          ${Number(form.cost).toLocaleString('es-CO')}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
      </div>
      <div className="border-t border-border/70 px-5 pb-5 pt-1">
        <Button type="button" onClick={handleSave} disabled={saving} className="w-full py-3 text-base">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : '✅ Guardar Labor'}
        </Button>
      </div>
    </GenericModal>
  );
}
