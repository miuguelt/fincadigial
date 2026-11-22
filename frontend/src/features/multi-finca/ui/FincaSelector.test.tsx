import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { FincaSelector } from './FincaSelector';

const { mockUseAuth, mockUseMultiFinca } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseMultiFinca: vi.fn(),
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../model/useMultiFinca', () => ({
  useMultiFinca: () => mockUseMultiFinca(),
}));

describe('FincaSelector - Aislamiento y Conmutación Multi-Finca', () => {
  const switchFincaMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMultiFinca.mockReturnValue({
      switchFinca: switchFincaMock,
      switching: false,
    });
  });

  it('no se renderiza si el usuario no tiene finca asignada', () => {
    mockUseAuth.mockReturnValue({
      user: null,
    });

    const { container } = render(
      <BrowserRouter>
        <FincaSelector />
      </BrowserRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renderiza la finca activa con dimensiones táctiles móviles (min-h-[44px])', () => {
    mockUseAuth.mockReturnValue({
      user: {
        finca_id: 1,
        finca_name: 'Hacienda El Retiro',
        fincas: [
          { finca_id: 1, name: 'Hacienda El Retiro', role: 'Propietario' },
          { finca_id: 2, name: 'Finca La Pradera', role: 'Operario' },
        ],
      },
    });

    render(
      <BrowserRouter>
        <FincaSelector />
      </BrowserRouter>
    );

    const trigger = screen.getByTestId('finca-selector');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-label', 'Finca actual: Hacienda El Retiro');
    expect(trigger).toHaveClass('min-h-[44px]');
  });

  it('permite desplegar el menú de fincas y activar otra finca', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: {
        finca_id: 1,
        finca_name: 'Hacienda El Retiro',
        fincas: [
          { finca_id: 1, name: 'Hacienda El Retiro', role: 'Propietario' },
          { finca_id: 2, name: 'Finca La Pradera', role: 'Operario' },
        ],
      },
    });

    render(
      <BrowserRouter>
        <FincaSelector />
      </BrowserRouter>
    );

    const trigger = screen.getByTestId('finca-selector');
    await user.click(trigger);

    // Debe mostrar la lista de fincas y las acciones
    expect(screen.getByText('Mis Fincas')).toBeInTheDocument();
    expect(screen.getByText('Vista Panorámica Multi-Finca')).toBeInTheDocument();
    expect(screen.getByText('Agregar nueva finca')).toBeInTheDocument();

    const options = screen.getAllByTestId('finca-option');
    expect(options.length).toBe(2);

    // Click en la segunda finca
    await user.click(options[1]);
    expect(switchFincaMock).toHaveBeenCalledWith(2);
  });
});
