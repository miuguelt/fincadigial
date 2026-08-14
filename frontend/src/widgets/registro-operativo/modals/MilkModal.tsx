import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
import { AnimalSelect } from '../components/AnimalSelect';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { MilkFormData } from '../types';

interface MilkModalProps {
  open: boolean;
  onClose: () => void;
  form: MilkFormData;
  setForm: (f: MilkFormData) => void;
  animals: any[];
  saving: boolean;
  onSubmit: () => Promise<boolean>;
}

const RING = 'focus:ring-amber-500/30';
const SESSIONS = ['Mañana', 'Tarde', 'Extra'];

export function MilkModal({ open, onClose, form, setForm, animals, saving, onSubmit }: MilkModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    // Conserva turno y fecha: el ordeño se registra vaca por vaca en la misma jornada.
    if (ok) setForm({ animalId: '', liters: '', session: form.session, date: form.date, notes: '' });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="🥛 Registrar Ordeño">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimalSelect animals={animals} value={form.animalId} onChange={v => setForm({ ...form, animalId: v })} label="¿De qué vaca?" required ringClass={RING} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ordeno-litros" className="block text-sm font-medium text-foreground mb-1.5">Litros <span className="text-danger">*</span></label>
            <input id="ordeno-litros" type="number" inputMode="decimal" min="0" step="0.1" placeholder="0" value={form.liters}
              onChange={e => setForm({ ...form, liters: e.target.value })}
              className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
          </div>
          <div>
            <label htmlFor="ordeno-turno" className="block text-sm font-medium text-foreground mb-1.5">Turno</label>
            <select id="ordeno-turno" value={form.session} onChange={e => setForm({ ...form, session: e.target.value })}
              className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}>
              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ordeno-fecha" className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input id="ordeno-fecha" type="date" max={getTodayColombia()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
        </div>
        <div>
          <label htmlFor="ordeno-notas" className="block text-sm font-medium text-foreground mb-1.5">Notas (opcional)</label>
          <textarea id="ordeno-notas" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Ej: bajó la producción, se le vio la ubre inflamada"
            className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING} resize-none`} />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Ordeño'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
