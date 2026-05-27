import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
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

export function TransferModal({ open, onClose, form, setForm, animals, fields, saving, onSubmit }: TransferModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    if (ok) setForm({ animalId: '', fieldId: '', date: new Date().toISOString().split('T')[0] });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="🛣️ Trasladar Ganado">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Animal</label>
          <select value={form.animalId} onChange={e => setForm({ ...form, animalId: e.target.value })}
            className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
            <option value="">— Seleccione —</option>
            {animals.map(a => <option key={a.id} value={a.id}>{a.record}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Potrero destino</label>
          <select value={form.fieldId} onChange={e => setForm({ ...form, fieldId: e.target.value })}
            className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
            <option value="">— Seleccione —</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name || f.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Traslado'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
