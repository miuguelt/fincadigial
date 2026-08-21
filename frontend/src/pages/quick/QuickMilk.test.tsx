import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickMilk from './QuickMilk';

/**
 * Regresión de la regla 5.1: una escritura sólo puede anunciarse como
 * registrada cuando el servidor la confirmó. Si el cliente la encoló por falta
 * de red, el mensaje debe decir que quedó pendiente.
 */
const { showToast, apiPost, enqueue } = vi.hoisted(() => ({
  showToast: vi.fn(),
  apiPost: vi.fn(),
  enqueue: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({
  __esModule: true,
  default: { post: apiPost, get: vi.fn() },
}));
vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));
vi.mock('@/shared/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}));
vi.mock('@/shared/api/offline/offlineQueue', () => ({
  offlineQueue: { enqueue },
}));
vi.mock('@/shared/utils/dataRefresh', () => ({
  emitDataRefresh: vi.fn(),
}));
vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    getAnimals: vi.fn().mockResolvedValue([{ id: 4, record: 'V-004', breed: { name: 'Holstein' } }]),
  },
}));

const registrarOrdeno = async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <QuickMilk />
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByLabelText(/vaca/i)).not.toBeDisabled());
  await user.selectOptions(screen.getByLabelText(/vaca/i), '4');
  await user.type(screen.getByLabelText(/litros/i), '8.5');
  await user.click(screen.getByRole('button', { name: /guardar producción/i }));
};

describe('QuickMilk', () => {
  beforeEach(() => {
    showToast.mockClear();
    apiPost.mockReset();
    enqueue.mockClear();
  });

  it('confirma el registro cuando el servidor acepta la escritura', async () => {
    apiPost.mockResolvedValue({ status: 201, data: { data: { id: 12 } } });

    await registrarOrdeno();

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/milk-production', expect.objectContaining({
      animal_id: 4,
      liters: 8.5,
      milking_session: 'AM',
    })));
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/registrada correctamente/i), 'success');
  });

  it('avisa que quedó pendiente cuando el cliente la encoló sin señal', async () => {
    apiPost.mockResolvedValue({
      status: 202,
      statusText: 'Accepted (Queued)',
      data: { __offlineQueued: true },
    });

    await registrarOrdeno();

    await waitFor(() => expect(showToast).toHaveBeenCalled());
    const mensajes = showToast.mock.calls.map((call) => String(call[0]));
    expect(mensajes.some((m) => /sin señal|pendiente|se enviará/i.test(m))).toBe(true);
    expect(mensajes.some((m) => /registrada correctamente/i.test(m))).toBe(false);
  });
});
