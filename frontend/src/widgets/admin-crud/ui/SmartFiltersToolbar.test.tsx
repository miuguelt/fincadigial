import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SmartFiltersToolbar } from './SmartFiltersToolbar';

describe('SmartFiltersToolbar: apertura de filtros', () => {
  it('abre la hoja de filtros desde el botón móvil', () => {
    render(
      <MemoryRouter>
        <SmartFiltersToolbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));

    expect(screen.getByRole('dialog', { name: 'Filtros del inventario' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver todos los animales' })).toBeInTheDocument();
  });
});
