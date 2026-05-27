import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
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

export function TreatmentModal({ open, onClose, form, setForm, animals, medications, saving, onSubmit }: TreatmentModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    if (ok) setForm({ animalId: '', medicationId: '', dose: '', date: new Date().toISOString().split('T')[0], description: 'Tratamiento rápido' });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title=" Aplicar Tratamiento">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Animal</label>
          <select value={form.animalId} onChange={e => setForm({ ...form, animalId: e.target.value })}
            className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30">
            <option value="">— Seleccione —</option>
            {animals.map(a => <option key={a.id} value={a.id}>{a.record}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Medicamento</label>
          <select value={form.medicationId} onChange={e => setForm({ ...form, medicationId: e.target.value })}
            className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30">
            <option value="">— Seleccione —</option>
            {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Dosis</label>
          <input type="text" placeholder="Ej: 5ml, 1 tableta" value={form.dose}
            onChange={e => setForm({ ...form, dose: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Descripción</label>
          <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none" />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Tratamiento'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
