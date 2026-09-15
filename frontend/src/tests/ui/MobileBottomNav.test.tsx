import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileBottomNav } from '@/widgets/dashboard-layout/MobileBottomNav';

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'Administrador', finca_id: 10 },
    role: 'Administrador',
    isAuthenticated: true,
  }),
}));

describe('MobileBottomNav Component', () => {
  it('renders all 5 thumb-zone destinations with Colombian Spanish labels', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MobileBottomNav isSidebarOpen={false} onToggleSidebar={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /ir a inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ir a ganado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acciones rápidas de la finca/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ir a potreros/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir menú de navegación/i })).toBeInTheDocument();
  });

  it('calls onToggleSidebar when the menu button is tapped', () => {
    const handleToggle = vi.fn();
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MobileBottomNav isSidebarOpen={false} onToggleSidebar={handleToggle} />
      </MemoryRouter>
    );

    const menuBtn = screen.getByRole('button', { name: /abrir menú de navegación/i });
    fireEvent.click(menuBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('dispatches toggle-quick-actions event when center action button is tapped', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MobileBottomNav isSidebarOpen={false} onToggleSidebar={vi.fn()} />
      </MemoryRouter>
    );

    const actionBtn = screen.getByRole('button', { name: /acciones rápidas de la finca/i });
    fireEvent.click(actionBtn);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'toggle-quick-actions' })
    );
    dispatchSpy.mockRestore();
  });

  it('updates badge counter when quick-actions-badge-updated event fires', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MobileBottomNav isSidebarOpen={false} onToggleSidebar={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.queryByText('5')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent('quick-actions-badge-updated', { detail: { count: 5 } })
      );
    });

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('indicates active page for Ganado when on /admin/animals', () => {
    render(
      <MemoryRouter initialEntries={['/admin/animals']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MobileBottomNav isSidebarOpen={false} onToggleSidebar={vi.fn()} />
      </MemoryRouter>
    );

    const ganadoBtn = screen.getByRole('button', { name: /ir a ganado/i });
    expect(ganadoBtn).toHaveAttribute('aria-current', 'page');
  });
});
