import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VeterinarianAssistancePanel } from './VeterinarianAssistancePanel';

const mocks = vi.hoisted(() => ({
  getInbox: vi.fn(),
  claim: vi.fn(),
  respond: vi.fn(),
  showToast: vi.fn(),
  sseListeners: [] as Array<(payload: unknown) => void>,
}));

vi.mock('@/entities/campesino', () => ({
  campesinoServices: {
    technicalAssistance: {
      getInbox: mocks.getInbox,
      claim: mocks.claim,
      respond: mocks.respond,
    },
  },
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({ user: { id: 28, fullname: 'Dra. Elena Ruiz', role: 'Veterinario' } }),
}));

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock('@/shared/hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({ supported: true, subscribed: false, busy: false, toggle: vi.fn() }),
}));

vi.mock('@/lib/events', () => ({
  subscribeSSE: (listener: (payload: unknown) => void) => {
    mocks.sseListeners.push(listener);
    return () => undefined;
  },
}));

vi.mock('./VeterinarianResponseDialog', () => ({
  VeterinarianResponseDialog: ({ open, item }: { open: boolean; item: { title?: string } | null }) =>
    open ? <div data-testid="response-dialog">Responder: {item?.title}</div> : null,
}));

const request = {
  id: 91,
  title: 'Ternera con poco apetito',
  category: 'pecuario',
  description: 'No come desde ayer y se ve decaída.',
  priority: 'high',
  status: 'open' as const,
  requested_at: '2026-08-12T10:00:00Z',
  requester: { id: 5, fullname: 'Ana Pérez' },
  assigned_user_id: null,
};

describe('VeterinarianAssistancePanel', () => {
  afterEach(() => { vi.useRealTimers(); });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sseListeners.length = 0;
    mocks.getInbox.mockResolvedValue({
      items: [request],
      counts: { waiting: 1, mine: 0, active: 1 },
    });
    mocks.claim.mockResolvedValue({ ...request, assigned_user_id: 28, status: 'in_progress' });
  });

  it('muestra la bandeja persistente y permite tomar el caso para responder', async () => {
    render(<VeterinarianAssistancePanel />);

    expect(await screen.findByText('Ternera con poco apetito')).toBeInTheDocument();
    expect(screen.getByText('Solicitó Ana Pérez')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activar avisos/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /tomar y responder/i }));

    await waitFor(() => expect(mocks.claim).toHaveBeenCalledWith(91));
    expect(await screen.findByTestId('response-dialog')).toHaveTextContent('Ternera con poco apetito');
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Caso asignado a ti. El solicitante ya fue notificado.',
      'success',
    );
  });

  it('agrupa avisos en tiempo real y evita recargar por cada evento', async () => {
    vi.useFakeTimers();
    render(<VeterinarianAssistancePanel />);
    expect(await screen.findByText('Ternera con poco apetito')).toBeInTheDocument();
    mocks.getInbox.mockClear();

    act(() => {
      mocks.sseListeners[0]?.({ data: { type: 'technical_assistance_request', request_id: 92 } });
      mocks.sseListeners[0]?.({ data: { type: 'technical_assistance_request', request_id: 92 } });
      mocks.sseListeners[0]?.({ data: { type: 'technical_assistance_request', request_id: 93 } });
      vi.advanceTimersByTime(650);
    });
    await waitFor(() => expect(mocks.getInbox).toHaveBeenCalledTimes(1));

    act(() => { vi.advanceTimersByTime(550); });
    expect(mocks.showToast).toHaveBeenCalledWith('Hay 2 nuevas solicitudes en la bandeja.', 'info', 5000);
    expect(screen.getByRole('status')).toHaveTextContent('Hay 2 solicitudes nuevas.');
  });
});
