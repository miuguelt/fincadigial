import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FarmWallet from './FarmWallet';

const { useFinancialMock } = vi.hoisted(() => ({
  useFinancialMock: vi.fn(),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({
    user: { finca_id: 1, finca_name: 'Finca desde BD' },
  }),
}));

vi.mock('@/entities/financial/hooks', () => ({
  useFinancial: useFinancialMock,
}));

describe('FarmWallet', () => {
  it('muestra el resumen y movimientos entregados por la API financiera', () => {
    useFinancialMock.mockReturnValue({
      transactions: [
        {
          id: 901,
          finca_id: 1,
          transaction_type: 'Ingreso',
          category: 'Venta de Leche',
          amount: 150000,
          date: '2026-08-15',
          description: 'Registro financiero desde BD',
        },
      ],
      summary: { total_income: 150000, total_expense: 0, balance: 150000, by_category: [] },
      loading: false,
      error: null,
      balance: 150000,
      refetch: vi.fn(),
    });

    render(<FarmWallet />);

    expect(useFinancialMock).toHaveBeenCalledWith({ fincaId: 1, autoFetch: true });
    expect(screen.getByText('Finca desde BD')).toBeInTheDocument();
    expect(screen.getByText('Registro financiero desde BD')).toBeInTheDocument();
    expect(screen.getByText('$ 150.000')).toBeInTheDocument();
    expect(screen.queryByText('Venta de Leche (240L)')).not.toBeInTheDocument();
  });
});
