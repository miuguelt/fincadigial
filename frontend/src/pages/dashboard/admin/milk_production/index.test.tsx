import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MilkProductionPage from './index';

const { getAllAnimals } = vi.hoisted(() => ({
  getAllAnimals: vi.fn(),
}));

let capturedConfig: any = null;

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({ role: 'Administrador', user: { id: 1, finca_id: 1 } }),
}));
vi.mock('@/shared/hooks/useGlobalViewMode', () => ({
  useGlobalViewMode: () => ['table', vi.fn()],
}));
vi.mock('@/entities/animal/api/animal.service', () => ({
  animalService: {
    getAll: getAllAnimals,
  },
}));
vi.mock('@/widgets/milk', () => ({
  MilkDashboard: ({ tableComponent }: { tableComponent: any }) => <div>{tableComponent}</div>,
}));
vi.mock('@/widgets/admin-crud', () => ({
  AdminCRUDPage: ({ config }: { config: any }) => {
    capturedConfig = config;
    const animalField = config?.formSections?.[0]?.fields?.find((f: any) => f.name === 'animal_id');
    return (
      <div data-testid="milk-animal-options">
        {(animalField?.options || []).map((opt: any) => (
          <span key={opt.value}>{opt.label}</span>
        ))}
      </div>
    );
  },
}));

describe('MilkProductionPage', () => {
  beforeEach(() => {
    capturedConfig = null;
    getAllAnimals.mockReset();
  });

  it('filtra el selector del formulario a hembras activas en lactancia', async () => {
    getAllAnimals.mockResolvedValue([
      { id: 1, record: 'VACA-LACT', sex: 'Hembra', status: 'Vivo', is_lactating: true },
      { id: 2, record: 'TORO-01', sex: 'Macho', status: 'Vivo', is_lactating: false },
      { id: 3, record: 'VACA-SECA', sex: 'Hembra', status: 'Vivo', is_lactating: false },
    ]);

    render(
      <MemoryRouter>
        <MilkProductionPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/VACA-LACT/)).toBeInTheDocument());
    expect(screen.queryByText(/TORO-01/)).not.toBeInTheDocument();
    expect(screen.queryByText(/VACA-SECA/)).not.toBeInTheDocument();
    expect(capturedConfig).toBeTruthy();
  });
});
