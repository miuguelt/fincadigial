import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingTour } from './OnboardingTour';
import { TOUR_KEYS } from './useOnboardingTour';

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    role: 'Operario',
    user: { id: 90, role: 'Operario', finca_id: 1 },
  }),
}));

describe('OnboardingTour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/operario/dashboard');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no vuelve a abrirse automáticamente si el usuario ya completó o saltó el recorrido', () => {
    localStorage.setItem(TOUR_KEYS.completed, '1');

    render(
      <MemoryRouter initialEntries={['/operario/dashboard']}>
        <OnboardingTour />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.queryByText(/recorrido guiado/i)).not.toBeInTheDocument();
  });

  it('no interrumpe al usuario si ya abrió un modal antes de cumplirse el temporizador de inicio', () => {
    render(
      <MemoryRouter initialEntries={['/operario/dashboard']}>
        <div role="dialog" aria-modal="true">
          Modal activo de ordeño
        </div>
        <OnboardingTour />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.queryByText(/recorrido guiado/i)).not.toBeInTheDocument();
  });

  it('cancela el inicio automático si el usuario abre las acciones rápidas (toggle-quick-actions)', () => {
    render(
      <MemoryRouter initialEntries={['/operario/dashboard']}>
        <OnboardingTour />
      </MemoryRouter>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent('toggle-quick-actions'));
      vi.advanceTimersByTime(1200);
    });

    expect(screen.queryByText(/recorrido guiado/i)).not.toBeInTheDocument();
  });

  it('presenta botones táctiles de 44 px cuando se abre y guarda completed al saltar', () => {
    window.history.replaceState({}, '', '/operario/dashboard?tour=1');

    render(
      <MemoryRouter initialEntries={['/operario/dashboard?tour=1']}>
        <OnboardingTour />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const skipBtn = screen.getByRole('button', { name: /saltar/i });
    const nextBtn = screen.getByRole('button', { name: /siguiente/i });
    expect(skipBtn.className).toContain('min-h-[44px]');
    expect(nextBtn.className).toContain('min-h-[44px]');

    fireEvent.click(skipBtn);
    expect(localStorage.getItem(TOUR_KEYS.completed)).toBe('1');
  });
});
