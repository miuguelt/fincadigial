import { useState, useEffect, useCallback } from 'react';
import { financialService, isIncomeTransaction, Transaction, FinancialSummary } from '../api/financial.service';

interface UseFinancialOptions {
  fincaId?: number;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  autoFetch?: boolean;
}

export function useFinancial(options: UseFinancialOptions = {}) {
  const { fincaId, dateFrom, dateTo, category, autoFetch = true } = options;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {};
      if (fincaId) params.finca_id = fincaId;
      if (category) params.category = category;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await financialService.getAll(params);
      setTransactions(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error cargando transacciones');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fincaId, category, dateFrom, dateTo]);

  const fetchSummary = useCallback(async () => {
    if (!fincaId) return;

    try {
      const data = await financialService.getSummary(fincaId, dateFrom, dateTo);
      setSummary(data);
      return data;
    } catch (err: any) {
      console.error('Error fetching financial summary:', err);
    }
  }, [fincaId, dateFrom, dateTo]);

  const createTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    setLoading(true);
    try {
      const newTransaction = await financialService.create(data);
      setTransactions(prev => [newTransaction, ...prev]);
      await fetchSummary(); // Actualizar resumen
      return newTransaction;
    } catch (err: any) {
      setError(err.message || 'Error creando transacción');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchSummary]);

  const getBalance = useCallback(() => {
    if (!transactions.length) return 0;
    return transactions.reduce((balance, t) => {
      return isIncomeTransaction(t)
        ? balance + Number(t.amount)
        : balance - Number(t.amount);
    }, 0);
  }, [transactions]);

  useEffect(() => {
    if (autoFetch && fincaId) {
      fetchTransactions();
      fetchSummary();
    }
  }, [autoFetch, fincaId, fetchTransactions, fetchSummary]);

  return {
    transactions,
    summary,
    loading,
    error,
    balance: getBalance(),
    fetchTransactions,
    fetchSummary,
    createTransaction,
    refetch: () => {
      fetchTransactions();
      fetchSummary();
    },
  };
}

export default useFinancial;
