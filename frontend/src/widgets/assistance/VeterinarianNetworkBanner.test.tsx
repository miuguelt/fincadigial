import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VeterinarianNetworkBanner } from './VeterinarianNetworkBanner';

describe('VeterinarianNetworkBanner', () => {
  it('expone una recuperación cuando no se puede cargar la red', () => {
    const onRetry = vi.fn();

    render(
      <VeterinarianNetworkBanner
        network={null}
        error="No se pudo consultar la red veterinaria."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo consultar la red veterinaria.');
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
