import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import QuickControl from './QuickControl';

const { showToast, createControl } = vi.hoisted(() => ({
  showToast: vi.fn(),
  createControl: vi.fn(),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, role: 'Operario' } }),
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
vi.mock('@/entities/control/api/control.service', () => ({
  controlService: {
    createControl,
  },
}));

describe('QuickControl', () => {
  beforeEach(() => {
    showToast.mockClear();
    createControl.mockReset();
  });

  it('envía peso decimal exacto sin truncar con parseInt', async () => {
    createControl.mockResolvedValue({ id: 99 });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuickControl />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué animal/i)).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText(/qué animal/i), '7');
    await user.type(screen.getByLabelText(/peso en báscula/i), '245.5');
    await user.click(screen.getByRole('button', { name: /guardar control/i }));

    await waitFor(() => expect(createControl).toHaveBeenCalledWith(expect.objectContaining({
      animal_id: 7,
      weight: 245.5,
    })));
  });

  it('muestra el mensaje detallado del servidor cuando falla el guardado', async () => {
    createControl.mockRejectedValue({
      response: {
        status: 400,
        data: { message: 'La fecha de control no puede ser futura' },
      },
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuickControl />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/qué animal/i)).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText(/qué animal/i), '7');
    await user.type(screen.getByLabelText(/peso en báscula/i), '300');
    await user.click(screen.getByRole('button', { name: /guardar control/i }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/fecha de control no puede ser futura/i),
      'error',
    ));
  });

  it('limita la fecha a hoy y usa botones de preset de al menos 44 px', async () => {
    render(
      <MemoryRouter>
        <QuickControl />
      </MemoryRouter>,
    );

    const dateInput = screen.getByLabelText(/fecha del control/i);
    expect(dateInput).toHaveAttribute('max', getTodayColombia());
    expect(screen.getByRole('button', { name: /\+5kg/i }).className).toContain('min-h-[44px]');
  });
});
