import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
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

export function MilkModal({ open, onClose, form, setForm, animals, saving, onSubmit }: MilkModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    if (ok) setForm({ animalId: '', liters: '', session: 'Mañana', date: new Date().toISOString().split('T')[0], notes: '' });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="🥛 Registrar Ordeño">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">¿De qué vaca?</label>
          <select value={form.animalId} onChange={e => setForm({ ...form, animalId: e.target.value })}
            className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
            <option value="">— Seleccione —</option>
            {animals.map(a => <option key={a.id} value={a.id}>{a.record} - {a.breed?.name || 'Sin Raza'}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">Litros</label>
            <input type="number" min="0" step="0.1" placeholder="0" value={form.liters}
              onChange={e => setForm({ ...form, liters: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">Turno</label>
            <select value={form.session} onChange={e => setForm({ ...form, session: e.target.value })}
              className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Notas (opcional)</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none" />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Ordeño'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
