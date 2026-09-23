import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SirePerformance from './SirePerformance';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';

const mockShowToast = vi.fn();
vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/features/auth/model/useRoleNavigation', () => ({
  useRoleNavigation: () => ({ goTo: vi.fn() }),
}));

vi.mock('@/entities/reproduction/api/reproduction.service', () => ({
  reproductionService: {
    getSirePerformance: vi.fn(),
  },
}));

const mockSireData = {
  period_months: 12,
  sires: [
    {
      sire_id: 1,
      record: 'TORO-DIAMANTE',
      breed: 'Brahman',
      inseminations: 10,
      positive_diagnoses: 8,
      conception_rate_pct: 80.0,
      total_offspring: 7,
      avg_birth_weight_kg: 34.5,
      grade: 'A' as const,
    },
    {
      sire_id: 2,
      record: 'TORO-BARCINO',
      breed: 'Gyr',
      inseminations: 5,
      positive_diagnoses: 2,
      conception_rate_pct: 40.0,
      total_offspring: 2,
      avg_birth_weight_kg: 31.0,
      grade: 'D' as const,
    },
  ],
};

describe('SirePerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra mensaje cuando no hay datos de desempeño disponibles', async () => {
    vi.mocked(reproductionService.getSirePerformance).mockResolvedValueOnce({ period_months: 12, sires: [] } as any);

    render(<SirePerformance isEmbedded />);

    await waitFor(() => {
      expect(screen.getByText(/No hay datos de desempeño de toros disponibles/i)).toBeInTheDocument();
    });
  });

  it('renderiza la lista de toros, calificaciones de clase y advertencias para toros con baja fertilidad', async () => {
    vi.mocked(reproductionService.getSirePerformance).mockResolvedValueOnce(mockSireData as any);

    render(<SirePerformance isEmbedded />);

    await waitFor(() => {
      expect(screen.getByText(/Evaluación Reproductiva de Toros y Reproductores/i)).toBeInTheDocument();
    });

    // Toros listados
    expect(screen.getAllByText('TORO-DIAMANTE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TORO-BARCINO').length).toBeGreaterThan(0);

    // Calificaciones
    expect(screen.getAllByText('CLASE A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CLASE D').length).toBeGreaterThan(0);

    // Advertencia de baja efectividad en toro Clase D
    expect(
      screen.getByText(/Alerta: Tasa baja. Sugerido descanso o examen andrológico./i),
    ).toBeInTheDocument();
  });
});
