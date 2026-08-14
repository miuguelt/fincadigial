import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
import { AnimalSelect } from '../components/AnimalSelect';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { TransferFormData } from '../types';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  form: TransferFormData;
  setForm: (f: TransferFormData) => void;
  animals: any[];
  fields: any[];
  saving: boolean;
  onSubmit: () => Promise<boolean>;
}

const RING = 'focus:ring-emerald-500/30';

export function TransferModal({ open, onClose, form, setForm, animals, fields, saving, onSubmit }: TransferModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    // Conserva potrero y fecha: normalmente se mueve un lote completo al mismo destino.
    if (ok) setForm({ animalId: '', fieldId: form.fieldId, date: form.date });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="🛣️ Trasladar Ganado">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimalSelect animals={animals} value={form.animalId} onChange={v => setForm({ ...form, animalId: v })} required ringClass={RING} />
        <div>
          <label htmlFor="traslado-potrero" className="block text-sm font-medium text-foreground mb-1.5">Potrero destino <span className="text-danger">*</span></label>
          <select id="traslado-potrero" value={form.fieldId} onChange={e => setForm({ ...form, fieldId: e.target.value })}
            className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}>
            <option value="">— Seleccione —</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name || f.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="traslado-fecha" className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input id="traslado-fecha" type="date" max={getTodayColombia()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Traslado'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
