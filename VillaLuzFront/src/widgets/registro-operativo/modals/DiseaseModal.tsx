import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
import type { DiseaseFormData } from '../types';

interface DiseaseModalProps {
  open: boolean;
  onClose: () => void;
  form: DiseaseFormData;
  setForm: (f: DiseaseFormData) => void;
  animals: any[];
  diseases: any[];
  saving: boolean;
  onSubmit: () => Promise<boolean>;
}

export function DiseaseModal({ open, onClose, form, setForm, animals, diseases, saving, onSubmit }: DiseaseModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    if (ok) setForm({ animalId: '', diseaseId: '', status: 'Activo', date: new Date().toISOString().split('T')[0], notes: '' });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="🤒 Reportar Enfermedad">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Animal</label>
          <select value={form.animalId} onChange={e => setForm({ ...form, animalId: e.target.value })}
            className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30">
            <option value="">— Seleccione —</option>
            {animals.map(a => <option key={a.id} value={a.id}>{a.record}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Diagnóstico</label>
          <select value={form.diseaseId} onChange={e => setForm({ ...form, diseaseId: e.target.value })}
            className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30">
            <option value="">— Seleccione —</option>
            {diseases.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Estado</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30">
            <option value="Activo">Activo</option>
            <option value="En tratamiento">En tratamiento</option>
            <option value="Recuperado">Recuperado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Notas</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none" />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Diagnóstico'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
