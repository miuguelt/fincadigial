/**
 * Historial de movimientos.
 *
 * En pantalla ancha es una tabla; en el celular son tarjetas, porque una tabla
 * de seis columnas en 320 px sólo se puede leer arrastrándola de lado.
 */
import { Calendar, DollarSign, Trash } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { FitText } from '@/shared/ui/FitText';
import { cn } from '@/shared/ui/cn';
import { isIncomeTransaction } from '@/entities/financial/api/financial.service';
import { formatCOP, type FinancialTransaction } from '../model/financialCharts';
import type { Transaction } from '../model/useFinancialDashboard';

interface Props {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  deleting: boolean;
}

const isIncome = (transaction: FinancialTransaction) =>
  isIncomeTransaction(transaction as { transaction_type: 'Ingreso' | 'Gasto' });

const amountClass = (transaction: FinancialTransaction) =>
  isIncome(transaction) ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300';

const signedAmount = (transaction: FinancialTransaction) =>
  `${isIncome(transaction) ? '+' : '−'}${formatCOP(transaction.amount)}`;

function TypeBadge({ transaction }: { transaction: FinancialTransaction }) {
  return (
    <Badge
      className={cn(
        'text-[11px] font-black uppercase tracking-wider',
        isIncome(transaction)
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
      )}
    >
      {transaction.transaction_type}
    </Badge>
  );
}

function DeleteButton({ id, onDelete, deleting }: { id: number; onDelete: (id: number) => void; deleting: boolean }) {
  return (
    <Button
      variant="ghost"
      disabled={deleting}
      aria-label="Eliminar movimiento"
      onClick={() => {
        if (window.confirm('¿Eliminar este movimiento? No se puede deshacer.')) onDelete(id);
      }}
      className="h-9 w-9 rounded-xl p-0 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
    >
      <Trash className="h-4 w-4" />
    </Button>
  );
}

function EmptyRow() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground opacity-60">
      <DollarSign className="h-12 w-12" />
      <p className="text-sm font-bold">Todavía no hay movimientos registrados</p>
    </div>
  );
}

export function TransactionsTable({ transactions, onDelete, deleting }: Props) {
  return (
    <motion.section
      aria-labelledby="historial-movimientos"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className="overflow-hidden rounded-2xl border-border/50 bg-card shadow-lg">
        <CardHeader className="border-b border-border/30 p-6 sm:p-8">
          <CardTitle id="historial-movimientos" className="text-xl font-black text-foreground">
            Historial de Movimientos
          </CardTitle>
          <CardDescription className="mt-1 font-medium">Todo lo que entró y salió de la finca</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <EmptyRow />
          ) : (
            <>
              <ul className="divide-y divide-border/20 lg:hidden">
                {transactions.map((transaction) => (
                  <li key={transaction.id} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TypeBadge transaction={transaction} />
                        <span className="text-xs text-muted-foreground">{transaction.date}</span>
                      </div>
                      <FitText as="p" className="mt-1 text-sm font-semibold text-foreground">
                        {transaction.category}
                      </FitText>
                      {transaction.description && (
                        <p className="fit-clamp text-xs text-muted-foreground">{transaction.description}</p>
                      )}
                      <p className={cn('mt-1 text-base font-black', amountClass(transaction))}>
                        {signedAmount(transaction)}
                      </p>
                    </div>
                    <DeleteButton id={transaction.id} onDelete={onDelete} deleting={deleting} />
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/30 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="px-6 py-4">Fecha</th>
                      <th scope="col" className="px-6 py-4">Tipo</th>
                      <th scope="col" className="px-6 py-4">Categoría</th>
                      <th scope="col" className="px-6 py-4">Descripción</th>
                      <th scope="col" className="px-6 py-4 text-right">Monto</th>
                      <th scope="col" className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-sm">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="transition-colors hover:bg-muted/40">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
                            {transaction.date}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <TypeBadge transaction={transaction} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-foreground">
                          {transaction.category}
                        </td>
                        <td className="fit-clamp max-w-xs px-6 py-4 text-muted-foreground">
                          {transaction.description || '—'}
                        </td>
                        <td className={cn('whitespace-nowrap px-6 py-4 text-right font-black tabular-nums', amountClass(transaction))}>
                          {signedAmount(transaction)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <DeleteButton id={transaction.id} onDelete={onDelete} deleting={deleting} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export default TransactionsTable;
