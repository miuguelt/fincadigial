import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useCrudUrlSync } from './useCrudUrlSync';

function createWrapper(initialEntries = ['/admin/animals']) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    );
  };
}

describe('useCrudUrlSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite escribir sin que el estado se borre antes del debounce', async () => {
    const { result } = renderHook(
      () =>
        useCrudUrlSync<{ id: number }>({
          canCreate: true,
          canUpdate: true,
          isModalOpen: false,
          editingItem: null,
          service: { getById: vi.fn() },
          openCreate: vi.fn(),
          openEdit: vi.fn(),
          onEditLoadError: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    // Estado inicial vacío
    expect(result.current.searchQuery).toBe('');

    // El usuario teclea 'B'
    act(() => {
      result.current.setSearchQuery('B');
    });

    // Inmediatamente (antes del debounce), el valor debe mantenerse en 'B', NO reiniciarse a ''
    expect(result.current.searchQuery).toBe('B');

    // El usuario teclea 'Bovino'
    act(() => {
      result.current.setSearchQuery('Bovino');
    });

    expect(result.current.searchQuery).toBe('Bovino');

    // Avanzar el reloj para disparar el debounce de 300 ms
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Debe persistir 'Bovino' y haberse reflejado en searchParams
    expect(result.current.searchQuery).toBe('Bovino');
    expect(result.current.searchParams.get('search')).toBe('Bovino');
  });

  it('inicializa searchQuery desde la URL si existe ?search=...', () => {
    const { result } = renderHook(
      () =>
        useCrudUrlSync<{ id: number }>({
          canCreate: true,
          canUpdate: true,
          isModalOpen: false,
          editingItem: null,
          service: { getById: vi.fn() },
          openCreate: vi.fn(),
          openEdit: vi.fn(),
          onEditLoadError: vi.fn(),
        }),
      { wrapper: createWrapper(['/admin/animals?search=Holstein']) }
    );

    expect(result.current.searchQuery).toBe('Holstein');
    expect(result.current.searchParams.get('search')).toBe('Holstein');
  });
});
