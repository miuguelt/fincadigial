/**
 * Panel financiero de la finca: cuánto entró, cuánto salió y en qué.
 *
 * Este archivo sólo compone: los datos vienen de `useFinancialDashboard`, las
 * descargas de `useFinancialExports` y cada bloque tiene su componente.
 */
import { useState } from 'react';
import { DollarSign, FileSpreadsheet, FileText, Plus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/ui/button';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { useFinancialDashboard } from './model/useFinancialDashboard';
import { useFinancialExports } from './model/useFinancialExports';
import { FinancialCharts } from './ui/FinancialCharts';
import { FinancialKpiCards } from './ui/FinancialKpiCards';
import { NewTransactionModal } from './ui/NewTransactionModal';
import { TransactionsTable } from './ui/TransactionsTable';

const FinancialDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { summary, transactions, cashFlow, expenses, createTransaction, deleteTransaction } =
    useFinancialDashboard();
  const { exportingExcel, exportingPdf, exportExcel, exportPdf } = useFinancialExports();

  const nothingToExport = transactions.length === 0;

  return (
    <div className="min-h-full space-y-6 overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <DataScreenHeader
        icon={<DollarSign className="h-5 w-5 text-white" />}
        iconClassName="from-emerald-500 to-teal-600 shadow-emerald-500/20"
        title={<>Gestión y Balance <span className="text-emerald-700 dark:text-emerald-400">Financiero</span></>}
        description="Ingresos, egresos y retorno de la finca"
        actions={
          <>
            <Button
              onClick={exportExcel}
              loading={exportingExcel}
              disabled={nothingToExport}
              variant="outline"
              className="h-10 gap-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Exportar Excel
            </Button>
            <Button
              onClick={exportPdf}
              loading={exportingPdf}
              disabled={nothingToExport}
              variant="outline"
              className="h-10 gap-2"
            >
              <FileText className="h-4 w-4 text-destructive" />
              Informe PDF
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="h-10 gap-2 font-bold">
              <Plus className="h-4 w-4" />
              Nuevo movimiento
            </Button>
          </>
        }
      />

      <FinancialKpiCards summary={summary} />

      {transactions.length > 0 && <FinancialCharts cashFlow={cashFlow} expenses={expenses} />}

      <TransactionsTable
        transactions={transactions}
        onDelete={(id) => deleteTransaction.mutate(id)}
        deleting={deleteTransaction.isPending}
      />

      <AnimatePresence>
        {isModalOpen && (
          <NewTransactionModal
            submitting={createTransaction.isPending}
            onClose={() => setIsModalOpen(false)}
            onSubmit={(data) =>
              createTransaction.mutate(data, { onSuccess: () => setIsModalOpen(false) })
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancialDashboard;
