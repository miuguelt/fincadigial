import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders default error message and title', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error al cargar información')).toBeInTheDocument();
    expect(
      screen.getByText('Ocurrió un error inesperado al consultar los datos del servidor.')
    ).toBeInTheDocument();
  });

  it('renders custom title and message', () => {
    render(
      <ErrorState
        title="Fallo de conexión"
        message="No se pudo contactar con el servidor de la finca."
      />
    );
    expect(screen.getByText('Fallo de conexión')).toBeInTheDocument();
    expect(
      screen.getByText('No se pudo contactar con el servidor de la finca.')
    ).toBeInTheDocument();
  });

  it('handles retry action button click', async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    render(<ErrorState onRetry={handleRetry} actionLabel="Reintentar carga" />);
    const retryBtn = screen.getByRole('button', { name: 'Reintentar carga' });
    expect(retryBtn).toBeInTheDocument();

    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
