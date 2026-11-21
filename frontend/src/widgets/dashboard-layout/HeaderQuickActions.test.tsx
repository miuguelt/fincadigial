import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HeaderQuickActions from './HeaderQuickActions';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: mockUseAuth,
}));

describe('HeaderQuickActions', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('filtra acciones sin permiso para Operario y ofrece leche, pesaje y traslado', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'Operario' } });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <HeaderQuickActions />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /atajos de finca/i }));

    expect(await screen.findByText('Registrar leche')).toBeInTheDocument();
    expect(screen.getByText('Registrar pesaje')).toBeInTheDocument();
    expect(screen.getByText('Trasladar animal')).toBeInTheDocument();
    expect(screen.queryByText('Reportar enfermedad')).not.toBeInTheDocument();
    expect(screen.queryByText('Atender una res')).not.toBeInTheDocument();
  });

  it('muestra todas las acciones rápidas para Capataz', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'Capataz' } });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <HeaderQuickActions />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /atajos de finca/i }));

    expect(await screen.findByText('Registrar leche')).toBeInTheDocument();
    expect(screen.getByText('Reportar enfermedad')).toBeInTheDocument();
    expect(screen.getByText('Atender una res')).toBeInTheDocument();
  });
});
