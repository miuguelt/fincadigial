import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFinancialDashboard } from './useFinancialDashboard';

const { showToast, mockApiFetch } = vi.hoisted(() => ({
  showToast: vi.fn(),
  mockApiFetch: vi.fn(),
}));

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('@/shared/api/apiFetch', () => ({
  apiFetch: mockApiFetch,
}));
vi.mock('@/shared/api/client', () => ({
  unwrapApi: (res: any) => res?.data ?? res,
}));
vi.mock('@/entities/financial/api/financial.service', () => ({
  deduplicateTransactions: (list: any[]) => list,
  financialService: {
    getAllTransactions: vi.fn().mockResolvedValue([]),
  },
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('useFinancialDashboard', () => {
  beforeEach(() => {
    showToast.mockClear();
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ data: { total_income: 0, total_expense: 0, balance: 0, roi_percentage: 0 } });
  });

  it('muestra el mensaje real del servidor cuando falla al crear o eliminar un movimiento', async () => {
    const { result } = renderHook(() => useFinancialDashboard(), { wrapper: createWrapper() });

    mockApiFetch.mockRejectedValueOnce({
      response: { status: 422, data: { message: 'La fecha del movimiento no puede ser futura' } },
    });

    await act(async () => {
      try {
        await result.current.createTransaction.mutateAsync({
          transaction_type: 'Ingreso',
          category: 'Venta de Leche',
          amount: '50000',
          date: '2026-11-21',
          description: '',
        });
      } catch {
        // Error esperado en la prueba
      }
    });

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('La fecha del movimiento no puede ser futura', 'error'),
    );

    mockApiFetch.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'No tienes permiso para eliminar este movimiento' } },
    });

    await act(async () => {
      try {
        await result.current.deleteTransaction.mutateAsync(14);
      } catch {
        // Error esperado en la prueba
      }
    });

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('No tienes permiso para eliminar este movimiento', 'error'),
    );
  });
});
