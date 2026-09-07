import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/app/providers/ToastContext';
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
  withdrawalAnimals?: Record<number | string, { endDate: string; description?: string }>;
  saving: boolean;
  onSubmit: () => Promise<boolean>;
}

const RING = 'focus:ring-amber-500/30';
const SESSIONS = ['Mañana', 'Tarde', 'Extra'];

const isMale = (a: any): boolean => {
  const s = String(a?.sex ?? a?.gender ?? '').trim().toLowerCase();
  return ['macho', 'male', 'm', '1', '01'].includes(s);
};

export function MilkModal({
  open,
  onClose,
  form,
  setForm,
  animals,
  withdrawalAnimals,
  saving,
  onSubmit,
}: MilkModalProps) {
  const { showToast } = useToast();
  const [confirmRetiro, setConfirmRetiro] = useState(false);
  const selectedAnimal = form.animalId ? animals.find(a => String(a.id) === String(form.animalId)) : undefined;
  const selectedWithdrawal = form.animalId ? withdrawalAnimals?.[form.animalId] : undefined;

  // Cambió la vaca: la confirmación del retiro de la anterior no vale para esta.
  useEffect(() => setConfirmRetiro(false), [form.animalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAnimal && isMale(selectedAnimal)) {
      showToast('El ordeño se registra a las vacas. Verifique el animal elegido.', 'error');
      return;
    }
    if (selectedWithdrawal && !confirmRetiro) {
      showToast('Confirme que la leche de esta vaca no irá al tanque ni a venta.', 'error');
      return;
    }
    const ok = await onSubmit();
    // Conserva turno y fecha: el ordeño se registra vaca por vaca en la misma jornada.
    if (ok) setForm({ animalId: '', liters: '', session: form.session, date: form.date, notes: '' });
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="🥛 Registrar Ordeño">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimalSelect
          animals={animals}
          value={form.animalId}
          onChange={v => setForm({ ...form, animalId: v })}
          withdrawalAnimals={withdrawalAnimals}
          label="¿De qué vaca?"
          required
          ringClass={RING}
        />

        {selectedAnimal && isMale(selectedAnimal) && (
          <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200" role="alert">
            Este animal figura como macho. El ordeño solo se registra a las vacas; no se podrá guardar.
          </p>
        )}

        {selectedWithdrawal && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-2 shadow-sm">
            <div className="flex items-center gap-1.5 font-black text-sm text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>🚨 ¡ALERTA DE RETIRO SANITARIO!</span>
            </div>
            <p className="leading-relaxed">
              Esta vaca tiene tratamiento activo (<strong>{selectedWithdrawal.description || 'Medicamento'}</strong>) con periodo de retiro hasta el <strong>{selectedWithdrawal.endDate}</strong>.
            </p>
            <p className="font-bold text-rose-800 dark:text-rose-300">
              ⚠️ La leche NO debe mezclarse en el tanque comunal ni enviarse a venta.
            </p>
            <label className="flex items-start gap-2.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-white/70 dark:bg-black/20 p-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmRetiro}
                onChange={e => setConfirmRetiro(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-rose-600"
              />
              <span className="font-bold text-rose-800 dark:text-rose-200">
                Confirmo que esta leche no se mezclará ni saldrá a la venta.
              </span>
            </label>
          </div>
        )}

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
        <Button type="submit" disabled={saving} className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl border-amber-600 hover:border-amber-700 text-base font-bold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : '✅ Guardar Ordeño'}
        </Button>
      </form>
    </ModalWrapper>
  );
}
