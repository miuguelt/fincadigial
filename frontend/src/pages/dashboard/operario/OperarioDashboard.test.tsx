import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OperarioDashboard from './OperarioDashboard';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: mockUseAuth,
}));
vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('@/shared/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true, totalOperations: 0 }),
}));
vi.mock('@/widgets/dashboard/LiveStats', () => ({
  LiveStats: () => <div data-testid="live-stats" />,
}));
vi.mock('@/widgets/finca/hero', () => ({
  FincaHeroBanner: () => <div data-testid="hero-banner" />,
}));
vi.mock('@/widgets/registro-operativo', () => ({
  useRegistroOperativo: () => ({
    activeModal: null,
    savingForm: false,
    animals: [],
    fields: [],
    diseases: [],
    medications: [],
    inventoryLots: [],
    withdrawalAnimals: {},
    milkForm: { animalId: '', liters: '', session: 'Mañana', date: '2026-11-21', notes: '' },
    setMilkForm: vi.fn(),
    transferForm: { animalId: '', fieldId: '', date: '2026-11-21' },
    setTransferForm: vi.fn(),
    diseaseForm: { animalId: '', diseaseId: '', status: 'Activo', date: '2026-11-21', notes: '' },
    setDiseaseForm: vi.fn(),
    treatmentForm: {
      animalId: '', medicationId: '', dose: '', frequency: 'Dosis única',
      date: '2026-11-21', description: '', observations: '', lotId: '', inventoryQuantity: '',
    },
    setTreatmentForm: vi.fn(),
    controlForm: { animalId: '', weight: '', height: '', health_status: 'Bueno', checkup_date: '2026-11-21', description: '' },
    setControlForm: vi.fn(),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    handleMilkingSubmit: vi.fn(),
    handleTransferSubmit: vi.fn(),
    handleDiseaseSubmit: vi.fn(),
    handleTreatmentSubmit: vi.fn(),
    handleControlSubmit: vi.fn(),
  }),
  MilkModal: () => null,
  TransferModal: () => null,
  DiseaseModal: () => null,
  TreatmentModal: () => null,
  ControlModal: () => null,
}));

describe('OperarioDashboard', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('muestra solo acciones permitidas al rol Operario e incluye Registrar Ordeño', () => {
    mockUseAuth.mockReturnValue({
      user: { fullname: 'Pedro Operario', role: 'Operario', finca_name: 'Villa Luz' },
      role: 'Operario',
    });

    render(
      <MemoryRouter>
        <OperarioDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /registrar ordeño/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar control o pesaje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trasladar animal/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar enfermedad/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar tratamiento/i })).not.toBeInTheDocument();
  });

  it('mantiene visibles las acciones sanitarias para un Administrador', () => {
    mockUseAuth.mockReturnValue({
      user: { fullname: 'Ana Admin', role: 'Administrador', finca_name: 'Villa Luz' },
      role: 'Administrador',
    });

    render(
      <MemoryRouter>
        <OperarioDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /registrar ordeño/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar enfermedad/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrar tratamiento/i })).toBeInTheDocument();
  });
});
