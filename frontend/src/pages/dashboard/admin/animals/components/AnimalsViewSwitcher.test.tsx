import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AnimalsViewSwitcher } from './AnimalsViewSwitcher';

vi.mock('@/shared/hooks/useGlobalViewMode', () => ({
  useGlobalViewMode: () => ['cards', vi.fn()],
}));

describe('AnimalsViewSwitcher: controles responsive', () => {
  it('mantiene las tres vistas en objetivos táctiles de 44 px', () => {
    render(
      <MemoryRouter>
        <AnimalsViewSwitcher />
      </MemoryRouter>
    );

    ['Vista en tabla', 'Vista en tarjetas', 'Vista Potreros'].forEach((name) => {
      expect(screen.getByRole('button', { name }).className).toContain('h-11');
    });
  });

  it('mantiene los filtros en un objetivo táctil de 44 px', () => {
    render(
      <MemoryRouter>
        <AnimalsViewSwitcher />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Filtros' }).className).toContain('h-11');
    expect(screen.getByRole('button', { name: /en gestación/i }).className).toContain('h-11');
  });
});
