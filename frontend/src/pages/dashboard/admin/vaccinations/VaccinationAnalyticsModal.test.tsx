import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { VaccinationAnalyticsModal } from './VaccinationAnalyticsModal';

describe('VaccinationAnalyticsModal', () => {
  const mockSeries = [
    { period: '2026-05', label: 'may', count: 4 },
    { period: '2026-06', label: 'jun', count: 2 },
  ];
  const mockSummary = {
    periodTotal: 6,
    averagePerMonth: 3,
    peakMonth: { period: '2026-05', label: 'may', count: 4 },
    activeMonths: 2,
    total: 20,
    recentToday: 2,
  };

  it('no renderiza nada cuando isOpen es false', () => {
    render(
      <MemoryRouter>
        <VaccinationAnalyticsModal
          isOpen={false}
          onClose={vi.fn()}
          series={mockSeries}
          summary={mockSummary}
          loading={false}
          error={false}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Análisis y Tendencias de Vacunación')).not.toBeInTheDocument();
  });

  it('renderiza título, KPIs y resumen cuando isOpen es true', () => {
    render(
      <MemoryRouter>
        <VaccinationAnalyticsModal
          isOpen={true}
          onClose={vi.fn()}
          series={mockSeries}
          summary={mockSummary}
          loading={false}
          error={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Análisis y Tendencias de Vacunación')).toBeInTheDocument();
    expect(screen.getByText('Total 12 Meses')).toBeInTheDocument();
    expect(screen.getByText('Promedio Mes')).toBeInTheDocument();
    expect(screen.getByText('Mes con Mayor Actividad')).toBeInTheDocument();
    expect(screen.getByText('Meses Activos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver Reportes Clínicos Completos/i })).toBeInTheDocument();
  });
});
