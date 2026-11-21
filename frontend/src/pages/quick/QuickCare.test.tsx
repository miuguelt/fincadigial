import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickCare from './QuickCare';

const { showToast, createControl } = vi.hoisted(() => ({
  showToast: vi.fn(),
  createControl: vi.fn(),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, role: 'Administrador' } }),
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
  diseaseService: { getDiseases: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/entities/vaccine/api/vaccines.service', () => ({
  vaccinesService: { getVaccines: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/entities/treatment-protocol/api/treatmentProtocols.service', () => ({
  treatmentProtocolsService: { getProtocols: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('@/entities/control/api/control.service', () => ({
  controlService: { createControl },
}));

describe('QuickCare', () => {
  beforeEach(() => {
    showToast.mockClear();
    createControl.mockReset();
  });

  it('conserva decimales en pesaje y muestra errores reales del servidor', async () => {
    createControl.mockResolvedValueOnce({ id: 10 });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuickCare />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué res vas a atender/i)).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText(/qué res vas a atender/i), '7');
    await user.click(screen.getByRole('button', { name: /pesaje/i }));
    await user.type(screen.getByLabelText(/peso en báscula/i), '38.5');
    await user.click(screen.getByRole('button', { name: /registrar control/i }));

    await waitFor(() => expect(createControl).toHaveBeenCalledWith(expect.objectContaining({
      animal_id: 7,
      weight: 38.5,
    })));
  });

  it('muestra el mensaje de error del backend cuando falla un pesaje', async () => {
    createControl.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: 'El peso supera el rango permitido' },
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuickCare />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué res vas a atender/i)).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText(/qué res vas a atender/i), '7');
    await user.click(screen.getByRole('button', { name: /pesaje/i }));
    await user.type(screen.getByLabelText(/peso en báscula/i), '250');
    await user.click(screen.getByRole('button', { name: /registrar control/i }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/peso supera el rango permitido/i),
      'error',
    ));
  });
});
