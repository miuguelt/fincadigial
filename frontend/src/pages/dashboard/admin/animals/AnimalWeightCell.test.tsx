import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimalWeightCell } from './AnimalWeightCell';
import { analyticsService } from '@/features/reporting/api/analytics.service';

vi.mock('@/features/reporting/api/analytics.service', () => ({
  analyticsService: {
    getWeightDeltas: vi.fn(),
  },
}));

const mockedDeltas = analyticsService.getWeightDeltas as unknown as ReturnType<typeof vi.fn>;

describe('AnimalWeightCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el peso y el chip de variación positiva', async () => {
    mockedDeltas.mockResolvedValue({
      '42': {
        latest_weight: 300,
        prev_weight: 290,
        delta_pct: 3.4,
        delta_kg: 10,
        last_checkup_date: '2026-09-01',
      },
    });

    render(<AnimalWeightCell animalId={42} current={300} />);

    expect(await screen.findByText('300 kg')).toBeInTheDocument();
    expect(await screen.findByText('+3.4%')).toBeInTheDocument();
  });

  it('marca en rojo una pérdida severa (>= 5%)', async () => {
    mockedDeltas.mockResolvedValue({
      '7': {
        latest_weight: 250,
        prev_weight: 265,
        delta_pct: -5.7,
        delta_kg: -15,
        last_checkup_date: '2026-08-20',
      },
    });

    const { container } = render(<AnimalWeightCell animalId={7} current={250} />);

    await screen.findByText('-5.7%');
    const chip = container.querySelector('.bg-rose-500\\/10');
    expect(chip).not.toBeNull();
  });

  it('sin controles con peso muestra solo el peso actual', async () => {
    mockedDeltas.mockResolvedValue({});

    const { container } = render(<AnimalWeightCell animalId={99} current={215} />);

    await waitFor(() => expect(mockedDeltas).toHaveBeenCalledWith([99]));
    expect(container.textContent).toContain('215 kg');
    expect(container.textContent).not.toContain('%');
  });

  it('sin peso registrado muestra guion', () => {
    render(<AnimalWeightCell animalId={1} current={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
