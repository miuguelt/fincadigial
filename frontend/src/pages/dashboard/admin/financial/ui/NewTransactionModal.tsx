/**
 * Alta de un movimiento.
 *
 * Las categorías dependen del tipo, así que al cambiar de ingreso a gasto se
 * reemplaza la categoría por la primera válida: dejar la anterior mandaba al
 * servidor combinaciones que no existen.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import type { NewTransaction } from '../model/useFinancialDashboard';

const CATEGORIES: Record<string, string[]> = {
  Ingreso: ['Venta de Leche', 'Venta de Animal', 'Otros'],
  Gasto: ['Medicamentos', 'Alimento', 'Servicios Veterinarios', 'Otros'],
};

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = (): NewTransaction => ({
  transaction_type: 'Ingreso',
  category: CATEGORIES.Ingreso[0],
  amount: '',
  date: today(),
  description: '',
});

const FIELD_CLASS =
  'h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

const LABEL_CLASS = 'text-xs font-black uppercase tracking-wider text-muted-foreground';

interface Props {
  onClose: () => void;
  onSubmit: (data: NewTransaction) => void;
  submitting: boolean;
}

export function NewTransactionModal({ onClose, onSubmit, submitting }: Props) {
  const [form, setForm] = useState<NewTransaction>(emptyForm);

  const update = (patch: Partial<NewTransaction>) => setForm((prev) => ({ ...prev, ...patch }));

  const changeType = (transaction_type: string) =>
    update({ transaction_type, category: CATEGORIES[transaction_type][0] });

  return (
    <div className="vl-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuevo-movimiento"
        className="vl-modal-surface w-full max-w-md overflow-hidden rounded-2xl border border-border/80 text-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between bg-emerald-700 p-6 text-white">
          <div>
            <h2 id="nuevo-movimiento" className="text-xl font-bold">Nuevo Movimiento</h2>
            <p className="mt-0.5 text-xs text-emerald-50">Registra una entrada o una salida de plata</p>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Cerrar"
            className="h-9 w-9 rounded-full p-0 text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(form);
          }}
          className="space-y-4 p-6"
        >
          <div className="space-y-1.5">
            <label className={LABEL_CLASS} htmlFor="tipo-movimiento">Tipo de movimiento</label>
            <select
              id="tipo-movimiento"
              className={FIELD_CLASS}
              value={form.transaction_type}
              onChange={(event) => changeType(event.target.value)}
            >
              <option value="Ingreso">Entra plata (+)</option>
              <option value="Gasto">Sale plata (−)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS} htmlFor="categoria-movimiento">Categoría</label>
            <select
              id="categoria-movimiento"
              className={FIELD_CLASS}
              value={form.category}
              onChange={(event) => update({ category: event.target.value })}
            >
              {CATEGORIES[form.transaction_type].map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS} htmlFor="monto-movimiento">Monto en pesos</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground/60">$</span>
              <Input
                id="monto-movimiento"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                required
                placeholder="0"
                className="h-11 rounded-xl border-border/50 bg-background/50 pl-7 font-semibold"
                value={form.amount}
                onChange={(event) => update({ amount: event.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS} htmlFor="fecha-movimiento">Fecha</label>
            <Input
              id="fecha-movimiento"
              type="date"
              required
              className="h-11 rounded-xl border-border/50 bg-background/50"
              value={form.date}
              onChange={(event) => update({ date: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLASS} htmlFor="descripcion-movimiento">Descripción</label>
            <Input
              id="descripcion-movimiento"
              type="text"
              placeholder="Para acordarte de qué fue"
              className="h-11 rounded-xl border-border/50 bg-background/50"
              value={form.description}
              onChange={(event) => update({ description: event.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border/30 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="h-11 rounded-xl px-4 font-semibold">
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} className="h-11 rounded-xl px-6 font-bold">
              Registrar
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default NewTransactionModal;
