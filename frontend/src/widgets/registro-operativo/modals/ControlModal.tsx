import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
import { AnimalSelect } from '../components/AnimalSelect';
import { HEALTH_STATUS_OPTIONS } from '../constants';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { ControlFormData } from '../types';

interface ControlModalProps {
  open: boolean;
  onClose: () => void;
  form: ControlFormData;
  setForm: (f: ControlFormData) => void;
  animals: any[];
  saving: boolean;
  onSubmit: () => Promise<boolean>;
}

const RING = 'focus:ring-teal-500/30';

export function ControlModal({ open, onClose, form, setForm, animals, saving, onSubmit }: ControlModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    // Conserva la fecha: el pesaje se hace de corrido sobre varios animales.
    if (ok) setForm({ animalId: '', weight: '', height: '', health_status: 'Bueno', checkup_date: form.checkup_date, description: '' });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="⚖️ Control y Pesaje">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimalSelect animals={animals} value={form.animalId} onChange={v => setForm({ ...form, animalId: v })} required ringClass={RING} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="control-peso" className="block text-sm font-medium text-foreground mb-1.5">⚖️ Peso (kg)</label>
            <input id="control-peso" type="number" inputMode="decimal" step="0.1" min="0" placeholder="Ej: 350" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })}
              className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
          </div>
          <div>
            <label htmlFor="control-alzada" className="block text-sm font-medium text-foreground mb-1.5">📏 Alzada (cm)</label>
            <input id="control-alzada" type="number" inputMode="decimal" step="0.1" min="0" placeholder="Ej: 130" value={form.height || ''} onChange={e => setForm({ ...form, height: e.target.value })}
              className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
          </div>
        </div>
        <div>
          <label htmlFor="control-estado" className="block text-sm font-medium text-foreground mb-1.5">Estado de salud <span className="text-danger">*</span></label>
          <select id="control-estado" value={form.health_status} onChange={e => setForm({ ...form, health_status: e.target.value as any })}
            className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}>
            {HEALTH_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="control-fecha" className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha <span className="text-danger">*</span></label>
          <input id="control-fecha" type="date" max={getTodayColombia()} value={form.checkup_date} onChange={e => setForm({ ...form, checkup_date: e.target.value })}
            className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
        </div>
        <div>
          <label htmlFor="control-observaciones" className="block text-sm font-medium text-foreground mb-1.5">📝 Observaciones</label>
          <textarea id="control-observaciones" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: se ve flaca, hay que subirle el concentrado"
            className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING} resize-none`} />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Control'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
