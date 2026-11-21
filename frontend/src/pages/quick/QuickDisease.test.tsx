import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import QuickDisease from './QuickDisease';

const { showToast, createAnimalDisease, mockUseAuth } = vi.hoisted(() => ({
  showToast: vi.fn(),
  createAnimalDisease: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: mockUseAuth,
}));
vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('@/shared/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true, totalOperations: 0 }),
}));
vi.mock('@/shared/api/offline/offlineQueue', () => ({
  offlineQueue: { enqueue: vi.fn() },
}));
vi.mock('@/shared/utils/dataRefresh', () => ({
  emitDataRefresh: vi.fn(),
}));
vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    getAnimals: vi.fn().mockResolvedValue([{ id: 7, record: 'BOV-007', breed: { name: 'Brahman' } }]),
  },
}));
vi.mock('@/entities/disease/api/disease.service', () => ({
  diseaseService: {
    getDiseases: vi.fn().mockResolvedValue([{ id: 2, name: 'Mastitis' }]),
  },
}));
vi.mock('@/entities/animal-disease/api/animalDiseases.service', () => ({
  animalDiseasesService: { createAnimalDisease },
}));

describe('QuickDisease', () => {
  beforeEach(() => {
    showToast.mockClear();
    createAnimalDisease.mockReset();
    mockUseAuth.mockReturnValue({ user: { id: 5, role: 'Administrador' } });
  });

  it('alinea estados canónicos sin Sospecha y limita fecha a hoy', async () => {
    render(
      <MemoryRouter>
        <QuickDisease />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué animal/i)).not.toBeDisabled());
    expect(screen.queryByRole('button', { name: /sospecha/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'En Tratamiento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recuperado' })).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de diagnóstico/i)).toHaveAttribute('max', getTodayColombia());
  });

  it('omite instructor_id cuando user.id no está definido en lugar de enviar 0', async () => {
    mockUseAuth.mockReturnValue({ user: {} });
    createAnimalDisease.mockResolvedValue({ id: 15 });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuickDisease />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué animal/i)).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText(/qué animal/i), '7');
    await user.selectOptions(screen.getByLabelText(/enfermedad o síntoma/i), '2');
    await user.click(screen.getByRole('button', { name: /registrar diagnóstico/i }));

    await waitFor(() => expect(createAnimalDisease).toHaveBeenCalledTimes(1));
    const payload = createAnimalDisease.mock.calls[0][0];
    expect(payload.instructor_id).not.toBe(0);
    expect(payload).not.toHaveProperty('instructor_id');
  });
});
