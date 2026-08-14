import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ModalWrapper } from './ModalWrapper';
import { AnimalSelect } from '../components/AnimalSelect';
import { getFinanceCategories } from '../constants';
import type { FinanceFormData } from '../types';
import { getTodayColombia } from '@/shared/utils/dateUtils';

interface FinanceModalProps {
  open: boolean;
  onClose: () => void;
  form: FinanceFormData;
  setForm: (f: FinanceFormData) => void;
  animals: any[];
  saving: boolean;
  onSubmit: () => Promise<boolean>;
}

const RING = 'focus:ring-emerald-500/30';

export function FinanceModal({ open, onClose, form, setForm, animals, saving, onSubmit }: FinanceModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    if (ok) setForm({ transaction_type: 'Gasto', category: 'Alimento', animalId: '', amount: '', date: getTodayColombia(), description: '' });
  };

  const currentCategories = getFinanceCategories(form.transaction_type);
  const selectedCategory = currentCategories.find(c => c.value === form.category);
  const amountPreview = Number(form.amount) > 0
    ? `$${Number(form.amount).toLocaleString('es-CO')}`
    : null;

  const switchType = (type: 'Ingreso' | 'Gasto') => {
    // La categoría vigente puede no existir en el otro catálogo: si no se
    // reemplaza, el backend rechaza el valor huérfano.
    setForm({ ...form, transaction_type: type, category: getFinanceCategories(type)[0].value });
  };

  return (
    <ModalWrapper open={open} onClose={onClose} title="💰 Registro Financiero">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2" role="group" aria-label="Tipo de movimiento">
          <button
            type="button"
            aria-pressed={form.transaction_type === 'Ingreso'}
            onClick={() => switchType('Ingreso')}
            className={`flex-1 min-h-12 py-3 rounded-xl font-bold border transition-colors ${
              form.transaction_type === 'Ingreso'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-card text-muted-foreground border-border hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300'
            }`}
          >
            📈 Entró plata
          </button>
          <button
            type="button"
            aria-pressed={form.transaction_type === 'Gasto'}
            onClick={() => switchType('Gasto')}
            className={`flex-1 min-h-12 py-3 rounded-xl font-bold border transition-colors ${
              form.transaction_type === 'Gasto'
                ? 'bg-red-600 text-white border-red-600 shadow-md'
                : 'bg-card text-muted-foreground border-border hover:border-red-500 hover:text-red-700 dark:hover:text-red-300'
            }`}
          >
            📉 Salió plata
          </button>
        </div>

        <div>
          <label htmlFor="finanza-categoria" className="block text-sm font-medium text-foreground mb-1.5">¿En qué? <span className="text-danger">*</span></label>
          <select
            id="finanza-categoria"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            className={`w-full px-3 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}
          >
            {currentCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
            ))}
          </select>
          {selectedCategory && (
            <p className="mt-1.5 text-xs text-muted-foreground" style={{ overflowWrap: 'break-word' }}>
              {selectedCategory.hint}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="finanza-monto" className="block text-sm font-medium text-foreground mb-1.5">Monto <span className="text-danger">*</span></label>
          <input
            id="finanza-monto"
            type="number" inputMode="numeric" min="0" step="1" placeholder="0"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-base tabular-nums focus:outline-none focus:ring-2 ${RING}`}
            required
          />
          {amountPreview && (
            <p className="mt-1.5 text-sm font-semibold text-foreground tabular-nums" aria-live="polite">{amountPreview}</p>
          )}
        </div>

        <AnimalSelect
          animals={animals}
          value={form.animalId || ''}
          onChange={v => setForm({ ...form, animalId: v })}
          label="Vincular a un animal (opcional)"
          ringClass={RING}
          allowEmpty
        />

        <div>
          <label htmlFor="finanza-fecha" className="block text-sm font-medium text-foreground mb-1.5">📅 Fecha</label>
          <input
            id="finanza-fecha"
            type="date"
            max={getTodayColombia()}
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className={`w-full px-4 py-3 min-h-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING}`}
            required
          />
        </div>

        <div>
          <label htmlFor="finanza-detalle" className="block text-sm font-medium text-foreground mb-1.5">Detalles (opcional)</label>
          <textarea
            id="finanza-detalle"
            rows={2}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="A quién le compró o le vendió, qué fue exactamente..."
            className={`w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 ${RING} resize-none`}
          />
        </div>

        <Button
          type="submit"
          disabled={saving}
          className={`w-full text-white rounded-xl py-3 text-base font-bold ${
            form.transaction_type === 'Ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : `✅ Guardar ${form.transaction_type}`}
        </Button>
      </form>
    </ModalWrapper>
  );
}
