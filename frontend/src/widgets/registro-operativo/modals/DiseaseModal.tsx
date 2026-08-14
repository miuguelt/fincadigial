import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
import { AnimalSelect } from '../components/AnimalSelect';
import { DISEASE_STATUS_OPTIONS } from '../constants';
import { getTodayColombia } from '@/shared/utils/dateUtils';
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

const RING = 'focus:ring-rose-500/30';

export function DiseaseModal({ open, onClose, form, setForm, animals, diseases, saving, onSubmit }: DiseaseModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    if (ok) setForm({ animalId: '', diseaseId: '', status: 'Activo', date: getTodayColombia(), notes: '' });
  };
  return (
    <ModalWrapper open={open} onClose={onClose} title="🤒 Reportar Enfermedad">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimalSelect animals={animals} value={form.animalId} onChange={v => setForm({ ...form, animalId: v })} required ringClass={RING} />
        <div>
          <label htmlFor="enfermedad-diagnostico" className="block text-sm font-medium text-foreground mb-1.5">Diagnóstico <span className="text-danger">*</span></label>
          <select id="enfermedad-diagnostico" value={form.diseaseId} onChange={e => setForm({ ...form, diseaseId: e.target.value })}
            className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}>
            <option value="">— Seleccione —</option>
            {diseases.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="enfermedad-estado" className="block text-sm font-medium text-foreground mb-1.5">Estado</label>
          <select id="enfermedad-estado" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
            className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}>
            {DISEASE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="enfermedad-fecha" className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input id="enfermedad-fecha" type="date" max={getTodayColombia()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`} />
        </div>
        <div>
          <label htmlFor="enfermedad-notas" className="block text-sm font-medium text-foreground mb-1.5">¿Qué le vio?</label>
          <textarea id="enfermedad-notas" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Ej: cojea de la pata trasera, no quiso comer desde ayer"
            className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING} resize-none`} />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-3 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Diagnóstico'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
