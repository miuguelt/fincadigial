import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
import { AnimalSelect } from '../components/AnimalSelect';
import { TREATMENT_FREQUENCIES } from '../constants';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { TreatmentFormData } from '../types';

interface TreatmentModalProps {
  open: boolean;
  onClose: () => void;
  form: TreatmentFormData;
  setForm: (f: TreatmentFormData) => void;
  animals: any[];
  medications: any[];
  saving: boolean;
  onSubmit: () => Promise<boolean>;
}

const RING = 'focus:ring-purple-500/30';

export function TreatmentModal({ open, onClose, form, setForm, animals, medications, saving, onSubmit }: TreatmentModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    if (ok) setForm({ animalId: '', medicationId: '', dose: '', frequency: 'Dosis única', date: getTodayColombia(), description: '', observations: '' });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="💉 Aplicar Tratamiento">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimalSelect animals={animals} value={form.animalId} onChange={v => setForm({ ...form, animalId: v })} required ringClass={RING} />
        <div>
          <label htmlFor="tratamiento-medicamento" className="block text-sm font-medium text-foreground mb-1.5">Medicamento <span className="text-danger">*</span></label>
          <select id="tratamiento-medicamento" value={form.medicationId} onChange={e => setForm({ ...form, medicationId: e.target.value })}
            className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}>
            <option value="">— Seleccione —</option>
            {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="tratamiento-dosis" className="block text-sm font-medium text-foreground mb-1.5">Dosis <span className="text-danger">*</span></label>
            <input id="tratamiento-dosis" type="text" placeholder="Ej: 5 ml, 1 tableta" value={form.dose}
              onChange={e => setForm({ ...form, dose: e.target.value })}
              className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
          </div>
          <div>
            <label htmlFor="tratamiento-frecuencia" className="block text-sm font-medium text-foreground mb-1.5">¿Cada cuánto? <span className="text-danger">*</span></label>
            <select id="tratamiento-frecuencia" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
              className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}>
              {TREATMENT_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="tratamiento-fecha" className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input id="tratamiento-fecha" type="date" max={getTodayColombia()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
        </div>
        <div>
          <label htmlFor="tratamiento-motivo" className="block text-sm font-medium text-foreground mb-1.5">¿Por qué lo trató?</label>
          <textarea id="tratamiento-motivo" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Ej: mastitis en el cuarto trasero derecho"
            className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING} resize-none`} />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Tratamiento'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
