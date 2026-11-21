import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBatchActions } from './crud.behavior';

describe('createBatchActions RBAC', () => {
  const baseArgs = () => ({
    clearSelectionRef: { current: null },
    selectedIdsRef: { current: [] },
    setBulkModal: vi.fn(),
    setSelectedAnimals: vi.fn(),
  });

  it('oculta vacunar (Salud) y Borrar para el rol Operario', () => {
    const renderToolbar = createBatchActions({ ...baseArgs(), currentRole: 'Operario' });
    render(<>{renderToolbar([1, 2], [{ id: 1 }, { id: 2 }], vi.fn())}</>);

    expect(screen.getByRole('button', { name: /traslado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pesaje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /imprimir/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salud/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /borrar/i })).not.toBeInTheDocument();
  });

  it('oculta Borrar para Capataz pero permite Salud (vacunar)', () => {
    const renderToolbar = createBatchActions({ ...baseArgs(), currentRole: 'Capataz' });
    render(<>{renderToolbar([1], [{ id: 1 }], vi.fn())}</>);

    expect(screen.getByRole('button', { name: /salud/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /borrar/i })).not.toBeInTheDocument();
  });

  it('permite todas las acciones masivas para Administrador', () => {
    const renderToolbar = createBatchActions({ ...baseArgs(), currentRole: 'Administrador' });
    render(<>{renderToolbar([1], [{ id: 1 }], vi.fn())}</>);

    expect(screen.getByRole('button', { name: /salud/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /borrar/i })).toBeInTheDocument();
  });
});
