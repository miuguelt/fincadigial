import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FertilityDashboard from './FertilityDashboard';
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
    getFertilityDashboard: vi.fn(),
    getHerdKpis: vi.fn(),
  },
}));

const mockFertilityData = {
  period_months: 12,
  conception_rate_pct: 65.0,
  conception_by_technique: { natural: 70.0, artificial: 50.0 },
  avg_interval_between_births_days: 410,
  perinatal_mortality_rate_pct: 3.5,
  events_by_month: { '2026-01': 5, '2026-02': 8 },
  top_females: [
    { animal_id: 101, record: 'VACA-TOP-1', inseminations: 2, positive: 2, rate: 100 },
  ],
  bottom_females: [
    { animal_id: 202, record: 'VACA-REPETIDORA-1', inseminations: 3, positive: 0, rate: 0 },
  ],
};

const mockHerdKpis = {
  period_months: 12,
  as_of: '2026-09-22',
  inventory: {
    pregnant: 15,
    served_pending: 5,
    open: 8,
    heifers: 12,
    total_females: 40,
    lactating: 18,
    breeding_females: 28,
  },
  efficiency: {
    pregnancy_rate_pct: 60.0,
    conception_rate_pct: 65.0,
    calving_interval_days: { avg: 410, median: 405, min: 380, max: 450, n: 10, target: 400, status: 'warning' },
    days_open: { avg: 120, median: 115, min: 80, max: 180, n: 10, target: 110, status: 'warning' },
    calving_to_first_service_days: { avg: 70, median: 68, min: 50, max: 95, n: 10, target: 60, status: 'success' },
    services_per_conception: { avg: 1.6, median: 1.5, min: 1, max: 3, n: 10, target: 1.7, status: 'success' },
    age_at_first_calving_months: { avg: 26, median: 26, min: 24, max: 28, n: 4, target: 28, status: 'success' },
    perinatal_mortality_pct: 3.5,
    total_services: 25,
    resolved_services: 20,
    confirmed_pregnancies: 13,
  },
  targets: {
    conception_rate_pct: { target: 60 },
    pregnancy_rate_pct: { target: 55 },
    perinatal_mortality_pct: { target: 5 },
  },
  status: {
    conception_rate_pct: 'success',
    pregnancy_rate_pct: 'success',
    perinatal_mortality_pct: 'success',
  },
  risk: {
    overdue_births: [],
    due_for_dry_off: [],
    unconfirmed_services: [],
    repeat_breeders: [
      { animal_id: 202, record: 'VACA-REPETIDORA-1', failed_services: 3, reason: '3 servicios fallidos' },
    ],
    open_over_limit: [],
    heifers_without_service: [],
    upcoming_births: [],
  },
  projection: {
    births_by_month: { '2026-10': 3 },
    dry_offs_by_month: { '2026-08': 2 },
  },
};

describe('FertilityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra estado vacío cuando no hay datos disponibles', async () => {
    vi.mocked(reproductionService.getFertilityDashboard).mockResolvedValueOnce(null as any);
    vi.mocked(reproductionService.getHerdKpis).mockResolvedValueOnce(null as any);

    render(<FertilityDashboard isEmbedded />);

    await waitFor(() => {
      expect(screen.getByText(/Todavía no hay datos de fertilidad/i)).toBeInTheDocument();
    });
  });

  it('renderiza el balance de fertilidad, comparador de técnicas y listas de atención', async () => {
    vi.mocked(reproductionService.getFertilityDashboard).mockResolvedValueOnce(mockFertilityData as any);
    vi.mocked(reproductionService.getHerdKpis).mockResolvedValueOnce(mockHerdKpis as any);

    render(<FertilityDashboard isEmbedded />);

    await waitFor(() => {
      expect(screen.getByText(/Balance de Fertilidad y Decisiones del Ganado/i)).toBeInTheDocument();
    });

    // Comparador de técnicas
    expect(screen.getAllByText(/Monta natural/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Inseminación artificial/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/La monta natural presenta mayor efectividad/i)).toBeInTheDocument();

    // Rankings de hembras
    expect(screen.getByText('VACA-TOP-1')).toBeInTheDocument();
    expect(screen.getAllByText('VACA-REPETIDORA-1').length).toBeGreaterThan(0);
  });

  it('permite registrar novedad directa desde la lista de hembras repetidoras', async () => {
    const onRegisterEventMock = vi.fn();
    vi.mocked(reproductionService.getFertilityDashboard).mockResolvedValueOnce(mockFertilityData as any);
    vi.mocked(reproductionService.getHerdKpis).mockResolvedValueOnce(mockHerdKpis as any);

    render(<FertilityDashboard isEmbedded onRegisterEvent={onRegisterEventMock} />);

    await waitFor(() => {
      expect(screen.getAllByText('VACA-REPETIDORA-1').length).toBeGreaterThan(0);
    });

    const novedadButtons = screen.getAllByRole('button', { name: /Novedad/i });
    expect(novedadButtons.length).toBeGreaterThan(0);

    fireEvent.click(novedadButtons[0]);
    expect(onRegisterEventMock).toHaveBeenCalledWith(202, 'VACA-REPETIDORA-1');
  });
});
