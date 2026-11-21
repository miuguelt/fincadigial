import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReproductionHub from './index';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';

const mockShowToast = vi.fn();

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/entities/reproduction/api/reproduction.service', () => ({
  reproductionService: {
    getSummary: vi.fn(),
  },
}));

vi.mock('./reproductionCrudConfig', () => ({
  createReproductionCrudConfig: vi.fn(() => ({})),
}));

vi.mock('./ReproductionHubView', () => ({
  ReproductionHubView: ({
    activeTab,
    handleTabChange,
    isCalvingModalOpen,
  }: {
    activeTab: string;
    handleTabChange: (tab: string) => void;
    isCalvingModalOpen?: boolean;
  }) => (
    <div>
      <output data-testid="active-tab">{activeTab}</output>
      <output data-testid="calving-open">{String(Boolean(isCalvingModalOpen))}</output>
      <button type="button" onClick={() => handleTabChange('eventos')}>Eventos</button>
    </div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

describe('ReproductionHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reproductionService.getSummary).mockResolvedValue({
      total_females: 0,
      total_events: 0,
      total_inseminations: 0,
      total_births: 0,
      active_pregnancies: 0,
      births_next_30_days: 0,
      overdue_births: 0,
      conception_rate_pct: null,
      total_alive_offspring: 0,
      total_dead_offspring: 0,
    });
  });

  it('lee la pestaña alertas desde la URL al abrir el módulo', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/reproduction?tab=alertas']}>
        <ReproductionHub />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('active-tab')).toHaveTextContent('alertas');
    await waitFor(() => expect(reproductionService.getSummary).toHaveBeenCalledTimes(1));
  });

  it('actualiza el parámetro tab cuando la persona cambia de pestaña', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/reproduction?tab=alertas']}>
        <ReproductionHub />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eventos' }));

    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=eventos'));
    expect(screen.getByTestId('active-tab')).toHaveTextContent('eventos');
  });

  it('abre el modal de parto asistido cuando llega ?calving=1 en la URL', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/reproduction?calving=1']}>
        <ReproductionHub />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('calving-open')).toHaveTextContent('true');
    await waitFor(() => expect(reproductionService.getSummary).toHaveBeenCalledTimes(1));
  });
});
