import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
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
    ControlDashboard: ({ tableComponent }: { tableComponent: ReactNode }) => <>{tableComponent}</>,
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
