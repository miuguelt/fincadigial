import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegulatoryReportsDashboard } from './RegulatoryReportsDashboard';
import { regulatoryApi } from '../api/regulatoryApi';

vi.mock('../api/regulatoryApi', () => ({
  regulatoryApi: {
    downloadReport: vi.fn(),
  },
}));

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('RegulatoryReportsDashboard - Informes Oficiales ICA y SINIGAN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(regulatoryApi.downloadReport).mockResolvedValue(undefined as any);
  });

  it('renderiza las 3 tarjetas de reportes oficiales y filtros de rango', () => {
    render(<RegulatoryReportsDashboard embedded={false} />);

    expect(screen.getByText(/reportes regulatorios/i)).toBeInTheDocument();
    expect(screen.getByText('Inventario de Ganado')).toBeInTheDocument();
    expect(screen.getByText('Movimientos de Ganado')).toBeInTheDocument();
    expect(screen.getByText('Sanidad y Bienestar')).toBeInTheDocument();

    expect(screen.getByLabelText(/desde/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hasta/i)).toBeInTheDocument();

    const csvButtons = screen.getAllByRole('button', { name: /^csv$/i });
    expect(csvButtons.length).toBe(3);
    expect(csvButtons[0]).toHaveClass('min-h-[44px]');

    const pdfButtons = screen.getAllByRole('button', { name: /^pdf$/i });
    expect(pdfButtons.length).toBe(3);
    expect(pdfButtons[0]).toHaveClass('min-h-[44px]');
  });

  it('descarga el reporte de inventario en CSV con las fechas seleccionadas', async () => {
    const user = userEvent.setup();
    render(<RegulatoryReportsDashboard embedded={false} />);

    const dateFromInput = screen.getByLabelText(/desde/i);
    const dateToInput = screen.getByLabelText(/hasta/i);

    await user.type(dateFromInput, '2026-01-01');
    await user.type(dateToInput, '2026-06-30');

    const csvButtons = screen.getAllByRole('button', { name: /^csv$/i });
    await user.click(csvButtons[0]); // Inventario

    expect(regulatoryApi.downloadReport).toHaveBeenCalledTimes(1);
    expect(regulatoryApi.downloadReport).toHaveBeenCalledWith(
      'inventory',
      expect.objectContaining({
        date_from: '2026-01-01',
        date_to: '2026-06-30',
        format: 'csv',
      })
    );
  });

  it('descarga el reporte de movimientos en PDF', async () => {
    const user = userEvent.setup();
    render(<RegulatoryReportsDashboard embedded={false} />);

    const pdfButtons = screen.getAllByRole('button', { name: /^pdf$/i });
    await user.click(pdfButtons[1]); // Movimientos

    expect(regulatoryApi.downloadReport).toHaveBeenCalledTimes(1);
    expect(regulatoryApi.downloadReport).toHaveBeenCalledWith(
      'movements',
      expect.objectContaining({
        format: 'pdf',
      })
    );
  });
});
