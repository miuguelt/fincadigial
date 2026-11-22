import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import QuickTransfer from './QuickTransfer';

const { showToast, createAnimalField } = vi.hoisted(() => ({
  showToast: vi.fn(),
  createAnimalField: vi.fn(),
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
    getAnimals: vi.fn().mockResolvedValue([{ id: 10, record: 'NOV-010', breed: { name: 'Angus' } }]),
  },
}));
vi.mock('@/entities/field/api/field.service', () => ({
  fieldService: {
    getFields: vi.fn().mockResolvedValue([{ id: 2, name: 'Potrero La Ceiba' }]),
  },
}));
vi.mock('@/entities/animal-field/api/animalFields.service', () => ({
  animalFieldsService: { createAnimalField },
}));

describe('QuickTransfer', () => {
  beforeEach(() => {
    showToast.mockClear();
    createAnimalField.mockReset();
  });

  it('muestra el mensaje real del servidor cuando falla el traslado', async () => {
    createAnimalField.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: 'El potrero de destino se encuentra en descanso forrajero' },
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuickTransfer />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué animal deseas trasladar/i)).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText(/qué animal deseas trasladar/i), '10');
    await user.selectOptions(screen.getByLabelText(/potrero de destino/i), '2');
    await user.click(screen.getByRole('button', { name: /registrar traslado/i }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/descanso forrajero/i),
      'error',
    ));
  });

  it('limita la fecha de traslado a hoy con getTodayColombia()', () => {
    render(
      <MemoryRouter>
        <QuickTransfer />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/fecha del traslado/i)).toHaveAttribute('max', getTodayColombia());
  });

  it('bloquea el envío si falta el animal o potrero y muestra advertencia', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuickTransfer />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué animal deseas trasladar/i)).not.toBeDisabled());
    await user.click(screen.getByRole('button', { name: /registrar traslado/i }));

    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/selecciona el animal y el potrero/i),
      'error',
    );
    expect(createAnimalField).not.toHaveBeenCalled();
  });
});
