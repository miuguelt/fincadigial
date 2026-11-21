import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BatchActionToolbar } from './BatchActionToolbar';

describe('BatchActionToolbar', () => {
  it('se ubica por encima de la navegación inferior móvil y mantiene contraste del botón cerrar', () => {
    render(
      <BatchActionToolbar
        selectedCount={2}
        onClear={vi.fn()}
        onTransfer={vi.fn()}
        onWeight={vi.fn()}
      />,
    );

    const closeBtn = screen.getByRole('button', { name: /cerrar selección/i });
    expect(closeBtn.className).toContain('text-white');
    expect(closeBtn.className).not.toContain('text-foreground');

    const wrapper = closeBtn.closest('.fixed');
    expect(wrapper?.className).toContain('z-[1045]');
    expect(wrapper?.className).toContain('md:bottom-4');
    expect(wrapper?.className).toContain('bottom-[calc(');

    expect(screen.getByRole('button', { name: /traslado/i }).className).toContain('min-h-[44px]');
  });

  it('oculta acciones masivas cuando no se entregan sus callbacks por RBAC', () => {
    render(
      <BatchActionToolbar
        selectedCount={3}
        onClear={vi.fn()}
        onTransfer={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /traslado/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salud/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /borrar/i })).not.toBeInTheDocument();
  });
});
