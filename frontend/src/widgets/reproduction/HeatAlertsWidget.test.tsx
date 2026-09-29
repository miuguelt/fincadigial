import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HeatAlertsWidget from './HeatAlertsWidget';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';

const mockShowToast = vi.fn();
const mockGoTo = vi.fn();
const mockGetHeatAlerts = vi.mocked(reproductionService.getHeatAlerts);

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/features/auth/model/useRoleNavigation', () => ({
  useRoleNavigation: () => ({ goTo: mockGoTo }),
}));

vi.mock('@/widgets/dashboard/animals/AnimalDetailModal', () => ({
  AnimalDetailModal: ({ animalId }: { animalId: number }) => (
    <div role="dialog">Ficha del animal {animalId}</div>
  ),
}));

vi.mock('@/entities/reproduction/api/reproduction.service', () => ({
  reproductionService: {
    getHeatAlerts: vi.fn(),
  },
}));

const alertFor = (index: number) => ({
  animal_id: index,
  record: `VACA-${String(index).padStart(3, '0')}`,
  breed: 'Brahman',
  days_since_last_heat: 18 + index,
  last_heat_date: '2026-09-01',
  priority: index >= 4 ? 'Alta' : 'Media',
  age_days: index === 1 ? 0 : 1200,
});

describe('HeatAlertsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra un estado de carga accesible mientras consulta las alertas', () => {
    mockGetHeatAlerts.mockReturnValueOnce(new Promise(() => {}) as never);

    render(<HeatAlertsWidget />);

    expect(screen.getByRole('heading', { name: 'Alertas de Celo' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /cargando alertas de celo/i })).toBeInTheDocument();
  });

  it('muestra las alertas, conserva la edad cero y permite abrir la ficha del animal', async () => {
    mockGetHeatAlerts.mockResolvedValueOnce([alertFor(1)] as never);

    render(<HeatAlertsWidget />);

    expect(await screen.findByText('VACA-001')).toBeInTheDocument();
    expect(screen.getByText(/0 años/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha de VACA-001' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Ficha del animal 1');
  });

  it('permite registrar el celo de una alerta con un nombre de acción explícito', async () => {
    const onRegisterHeat = vi.fn();
    mockGetHeatAlerts.mockResolvedValueOnce([alertFor(1)] as never);

    render(<HeatAlertsWidget onRegisterHeat={onRegisterHeat} />);

    await screen.findByText('VACA-001');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar celo para VACA-001' }));

    expect(onRegisterHeat).toHaveBeenCalledWith(1, 'VACA-001');
  });

  it('expande la lista cuando hay más de cinco alertas, sin navegar a la misma ruta', async () => {
    const alerts = Array.from({ length: 7 }, (_, index) => alertFor(index + 1));
    mockGetHeatAlerts.mockResolvedValueOnce(alerts as never);

    render(<HeatAlertsWidget />);

    await screen.findByText('VACA-001');
    expect(screen.queryByText('VACA-006')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar 2 alertas más' }));

    expect(screen.getByText('VACA-006')).toBeInTheDocument();
    expect(screen.getByText('VACA-007')).toBeInTheDocument();
    expect(mockGoTo).not.toHaveBeenCalled();
  });

  it('ofrece una acción útil cuando no hay alertas activas', async () => {
    const onCreateEvent = vi.fn();
    mockGetHeatAlerts.mockResolvedValueOnce([] as never);

    render(<HeatAlertsWidget onCreateEvent={onCreateEvent} />);

    expect(await screen.findByText('No hay alertas de celo activas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar novedad reproductiva' }));
    expect(onCreateEvent).toHaveBeenCalledTimes(1);
  });

  it('muestra un error con reintento cuando la consulta falla', async () => {
    mockGetHeatAlerts
      .mockRejectedValueOnce(new Error('fallo de red'))
      .mockResolvedValueOnce([alertFor(2)] as never);

    render(<HeatAlertsWidget />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cargar las alertas de celo');
    expect(mockShowToast).toHaveBeenCalledWith('Error al cargar alertas de celo', 'error');

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga de alertas' }));
    expect(await screen.findByText('VACA-002')).toBeInTheDocument();
    await waitFor(() => expect(mockGetHeatAlerts).toHaveBeenCalledTimes(2));
  });

  it('nombra el botón de actualización y vuelve a consultar las alertas', async () => {
    mockGetHeatAlerts
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    render(<HeatAlertsWidget />);

    await screen.findByText('No hay alertas de celo activas');
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar alertas de celo' }));

    await waitFor(() => expect(mockGetHeatAlerts).toHaveBeenCalledTimes(2));
  });
});
