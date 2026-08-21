import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminControlPage from './index';

const { refreshSummary } = vi.hoisted(() => ({ refreshSummary: vi.fn() }));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({ role: 'Operario', user: { id: 10, finca_id: 1 } }),
}));

vi.mock('@/shared/hooks/useGlobalViewMode', () => ({
  useGlobalViewMode: () => ['cards', vi.fn()],
}));

vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    getAll: vi.fn().mockResolvedValue([{ id: 7, record: 'VL-007' }]),
  },
}));

vi.mock('@/entities/animal/model/useAnimals', () => ({
  useAnimals: () => ({
    animals: [{ id: 7, record: 'VL-007', alias: 'Luna' }],
    loading: false,
  }),
}));

vi.mock('@/entities/animal/ui', () => ({
  AnimalLink: ({ label }: { label: string }) => <span>{label}</span>,
  AnimalGrowthLink: () => null,
}));

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@/entities/control/api/control.service', () => ({
  controlService: {
    create: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getPaginated: vi.fn().mockResolvedValue({ items: [] }),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/entities/milk/api/milk.service', () => ({
  milkService: {
    create: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getByAnimal: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('./hooks/useControlsSummary', () => ({
  useControlsSummary: () => ({
    dailyLiters: 0,
    weeklyAverage: 0,
    animalsMilked: 0,
    trendPercentage: 0,
    sickAnimals: 2,
    recentTreatments: 0,
    totalControls: 4,
    healthyPercentage: 75,
    attentionAnimals: [
      {
        animalId: 7,
        status: 'Malo',
        severity: 'alta',
        lastCheckDate: '2026-08-02',
        daysSinceCheck: 15,
        description: 'No come desde el martes',
      },
      {
        animalId: 99,
        status: 'Regular',
        severity: 'media',
        lastCheckDate: '2026-08-16',
        daysSinceCheck: 1,
        description: '',
      },
    ],
    controlRows: [],
    milkUnavailable: false,
    controlsUnavailable: false,
    loading: false,
    refresh: refreshSummary,
  }),
}));

vi.mock('@/widgets/admin-crud', () => ({
  AdminCRUDPage: () => <div>Listado de revisiones</div>,
}));

vi.mock('@/widgets/control', async () => {
  const { ControlEntryFormWidget } = await import('@/widgets/control/ControlEntryForm/ControlEntryFormWidget');
  return {
    ControlEntryFormWidget,
    ControlStats: () => <div>Resumen de salud</div>,
  };
});

vi.mock('@/widgets/milk', async () => {
  const { MilkEntryFormWidget } = await import('@/widgets/milk/MilkEntryForm/MilkEntryForm');
  return {
    MilkEntryFormWidget,
    MilkStats: () => <div>Resumen de ordeño</div>,
  };
});

vi.mock('../milk_production', () => ({
  default: () => <div>Historial de ordeños</div>,
}));

describe('AdminControlPage mobile-first modals', () => {
  it('abre cada tarea con únicamente los campos necesarios', async () => {
    const user = userEvent.setup();
    render(<AdminControlPage />);
    const quickActions = screen.getByRole('group', { name: 'Acciones rápidas de campo' });

    await user.click(within(quickActions).getByRole('button', { name: /Pesar animal/ }));
    let dialog = screen.getByRole('dialog', { name: 'Registrar peso' });
    expect(within(dialog).getByLabelText('Peso en kilogramos')).toBeInTheDocument();
    expect(within(dialog).getByRole('group', { name: '¿Cómo se veía el animal?' })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Altura en metros')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Estado de salud')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await user.click(within(quickActions).getByRole('button', { name: /Reportar salud/ }));
    dialog = screen.getByRole('dialog', { name: 'Reportar novedad de salud' });
    expect(within(dialog).getByRole('group', { name: '¿Cómo está el animal?' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('¿Qué observaste? (opcional)')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Peso en kilogramos')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Altura en metros')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await user.click(within(quickActions).getByRole('button', { name: /Registrar ordeño/ }));
    dialog = screen.getByRole('dialog', { name: 'Registrar ordeño' });
    expect(within(dialog).getByLabelText('Litros ordeñados')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Guardar ordeño' })).toBeInTheDocument();
    expect(within(dialog).getByText('Agregar datos de calidad (opcional)').closest('details')).not.toHaveAttribute('open');
  });
});

describe('AdminControlPage animales que necesitan atención', () => {
  const getPanel = () =>
    screen.getByRole('region', { name: 'Animales que necesitan atención' });

  it('muestra cuáles son los animales, no solo cuántos', async () => {
    render(<AdminControlPage />);
    await screen.findAllByText('VL-007');

    const items = within(getPanel()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Grave')).toBeInTheDocument();
    expect(within(items[0]).getByText(/hace 15 días/)).toBeInTheDocument();
    expect(within(items[0]).getByText('No come desde el martes')).toBeInTheDocument();
    expect(within(items[1]).getByText('En observación')).toBeInTheDocument();
  });

  it('identifica al animal aunque el catálogo no traiga su registro', async () => {
    render(<AdminControlPage />);
    await screen.findAllByText('VL-007');

    const items = within(getPanel()).getAllByRole('listitem');
    expect(within(items[1]).getAllByText('Animal 99').length).toBeGreaterThan(0);
  });

  it('abre la revisión con el animal de la alerta ya seleccionado', async () => {
    const user = userEvent.setup();
    render(<AdminControlPage />);
    await screen.findAllByText('VL-007');

    const items = within(getPanel()).getAllByRole('listitem');
    await user.click(within(items[0]).getByRole('button', { name: /Registrar revisión/ }));

    const dialog = screen.getByRole('dialog', { name: 'Reportar novedad de salud' });
    expect(within(dialog).getByLabelText('Animal')).toHaveTextContent('VL-007 - Luna');
  });

  it('ofrece la pestaña de estadísticas y reportes', () => {
    render(<AdminControlPage />);
    expect(
      screen.getByRole('tab', { name: 'Estadísticas y reportes' }),
    ).toBeInTheDocument();
  });
});
