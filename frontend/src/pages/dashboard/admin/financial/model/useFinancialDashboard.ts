/**
 * Datos y escrituras del panel financiero: resumen, movimientos, alta y baja.
 *
 * Las dos consultas se invalidan juntas porque el resumen se calcula en el
 * servidor a partir de los mismos movimientos: refrescar una sola dejaba el
 * balance contradiciendo la tabla que tenía debajo.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi } from '@/shared/api/client';
import {
  deduplicateTransactions,
  financialService,
  type Transaction,
} from '@/entities/financial/api/financial.service';
import { useToast } from '@/app/providers/ToastContext';
import { expensesByCategory, monthlyCashFlow } from './financialCharts';

export type { Transaction };

export interface FinancialSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  roi_percentage: number;
}

const EMPTY_SUMMARY: FinancialSummary = {
  total_income: 0,
  total_expense: 0,
  balance: 0,
  roi_percentage: 0,
};

export interface NewTransaction {
  transaction_type: string;
  category: string;
  amount: string;
  date: string;
  description: string;
}

export function useFinancialDashboard() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const summaryQuery = useQuery<FinancialSummary>({
    queryKey: ['financial_summary'],
    queryFn: async () => unwrapApi(await apiFetch({ url: '/financial/transactions/summary' } as any)),
  });

  const transactionsQuery = useQuery<Transaction[]>({
    queryKey: ['financial_transactions'],
    queryFn: () => financialService.getAllTransactions(),
  });

  const refreshBoth = () => {
    queryClient.invalidateQueries({ queryKey: ['financial_summary'] });
    queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
  };

  const createTransaction = useMutation({
    mutationFn: async (data: NewTransaction) =>
      unwrapApi(await apiFetch({ url: '/financial/transactions', method: 'POST', data } as any)),
    onSuccess: () => {
      refreshBoth();
      showToast('Movimiento registrado', 'success');
    },
    onError: () => showToast('No se pudo registrar el movimiento', 'error'),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: number) =>
      unwrapApi(await apiFetch({ url: `/financial/transactions/${id}`, method: 'DELETE' } as any)),
    onSuccess: () => {
      refreshBoth();
      showToast('Movimiento eliminado', 'success');
    },
    onError: () => showToast('No se pudo eliminar el movimiento', 'error'),
  });

  // El backend puede devolver el mismo movimiento por más de una vía; se
  // deduplica una sola vez y de ahí salen tabla y gráficas.
  const transactions = useMemo(
    () => deduplicateTransactions(transactionsQuery.data || []),
    [transactionsQuery.data],
  );

  return {
    summary: summaryQuery.data || EMPTY_SUMMARY,
    transactions,
    cashFlow: useMemo(() => monthlyCashFlow(transactions), [transactions]),
    expenses: useMemo(() => expensesByCategory(transactions), [transactions]),
    createTransaction,
    deleteTransaction,
  };
}
