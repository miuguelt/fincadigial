import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';

const { mockUseOfflineSync, mockOfflineQueue } = vi.hoisted(() => ({
  mockUseOfflineSync: vi.fn(),
  mockOfflineQueue: {
    onSyncResult: vi.fn(() => () => {}),
    retryFailedOperations: vi.fn(),
    clearFailedOperations: vi.fn(),
  },
}));

vi.mock('@/shared/hooks/useOfflineSync', () => ({
  useOfflineSync: () => mockUseOfflineSync(),
}));

vi.mock('@/shared/api/offline/offlineQueue', () => ({
  offlineQueue: mockOfflineQueue,
}));

describe('OnlineStatusIndicator', () => {
  const syncNowMock = vi.fn();

  beforeEach(() => {
    syncNowMock.mockReset();
    mockOfflineQueue.retryFailedOperations.mockReset();
    mockOfflineQueue.clearFailedOperations.mockReset();
  });

  it('no renderiza nada cuando está en línea sin operaciones pendientes', () => {
    mockUseOfflineSync.mockReturnValue({
      isOnline: true,
      pendingCount: 0,
      syncStatus: { syncing: false, failed: 0 },
      syncNow: syncNowMock,
    });

    const { container } = render(<OnlineStatusIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra estado "Sin conexión" y elevación móvil z-[1045] cuando se pierde la red', async () => {
    mockUseOfflineSync.mockReturnValue({
      isOnline: false,
      pendingCount: 0,
      syncStatus: { syncing: false, failed: 0 },
      syncNow: syncNowMock,
    });

    await act(async () => {
      render(<OnlineStatusIndicator />);
    });

    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(screen.getByText(/trabajando sin conexión/i)).toBeInTheDocument();
    const wrapper = screen.getByText('Sin conexión').closest('.fixed');
    expect(wrapper).toHaveClass('z-[1045]');
    expect(wrapper).toHaveClass('bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]');
  });

  it('muestra contador de operaciones pendientes y ejecuta sincronización al presionar el botón', async () => {
    const user = userEvent.setup();
    mockUseOfflineSync.mockReturnValue({
      isOnline: true,
      pendingCount: 3,
      syncStatus: { syncing: false, failed: 0 },
      syncNow: syncNowMock,
    });

    await act(async () => {
      render(<OnlineStatusIndicator />);
    });

    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText(/3 operación\(es\) esperando/i)).toBeInTheDocument();

    const syncBtn = screen.getByRole('button', { name: /sincronizar ahora/i });
    expect(syncBtn).toHaveClass('min-h-[44px]');
    await user.click(syncBtn);

    expect(syncNowMock).toHaveBeenCalledTimes(1);
  });

  it('ofrece botones de reintentar y limpiar cuando hay fallos de sincronización', async () => {
    const user = userEvent.setup();
    mockUseOfflineSync.mockReturnValue({
      isOnline: true,
      pendingCount: 0,
      syncStatus: { syncing: false, failed: 2 },
      syncNow: syncNowMock,
    });

    await act(async () => {
      render(<OnlineStatusIndicator />);
    });

    expect(screen.getByText(/error de sync/i)).toBeInTheDocument();
    expect(screen.getByText(/2 operación\(es\) fallida\(s\)/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    expect(retryBtn).toHaveClass('min-h-[44px]');
    await user.click(retryBtn);
    expect(mockOfflineQueue.retryFailedOperations).toHaveBeenCalledTimes(1);

    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    expect(clearBtn).toHaveClass('min-h-[44px]');
    await user.click(clearBtn);
    expect(mockOfflineQueue.clearFailedOperations).toHaveBeenCalledTimes(1);
  });
});
