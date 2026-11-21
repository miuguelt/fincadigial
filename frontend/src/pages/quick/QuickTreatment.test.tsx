import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import QuickTreatment from './QuickTreatment';

const { showToast, createTreatment } = vi.hoisted(() => ({
  showToast: vi.fn(),
  createTreatment: vi.fn(),
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
vi.mock('@/entities/medication/api/medications.service', () => ({
  medicationsService: {
    getMedications: vi.fn().mockResolvedValue([{ id: 3, name: 'Oxitetraciclina' }]),
  },
}));
vi.mock('@/entities/treatment/api/treatments.service', () => ({
  treatmentsService: { createTreatment },
}));

describe('QuickTreatment', () => {
  beforeEach(() => {
    showToast.mockClear();
    createTreatment.mockReset();
  });

  it('muestra el mensaje real del servidor cuando falla al guardar tratamiento', async () => {
    createTreatment.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: 'El episodio no corresponde a la res seleccionada' },
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuickTreatment />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué animal recibe/i)).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText(/qué animal recibe/i), '7');
    await user.selectOptions(screen.getByLabelText(/medicamento/i), '3');
    await user.type(screen.getByLabelText(/dosis administrada/i), '10 ml');
    await user.click(screen.getByRole('button', { name: /guardar tratamiento/i }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/episodio no corresponde/i),
      'error',
    ));
  });

  it('limita la fecha de aplicación a hoy', () => {
    render(
      <MemoryRouter>
        <QuickTreatment />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/fecha de aplicación/i)).toHaveAttribute('max', getTodayColombia());
  });
});
