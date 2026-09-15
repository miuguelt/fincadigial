import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CRUDCardGrid } from './CRUDCardGrid';

describe('CRUDCardGrid: selección táctil', () => {
  it('expone toda la superficie de 44 px como etiqueta del checkbox', () => {
    render(
      <CRUDCardGrid
        items={[{ id: 7, record: 'BOV-007' }]}
        config={{
          entityName: 'Animal',
          columns: [{ key: 'record', label: 'Registro' }],
          enableSelection: true,
          renderCard: () => <div>Animal BOV-007</div>,
        }}
        selectedIds={[]}
        onToggleSelect={vi.fn()}
        onOpenDetail={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Seleccionar Animal 7' });
    const touchTarget = checkbox.closest('label');

    expect(touchTarget).not.toBeNull();
    expect(touchTarget?.className).toContain('h-11');
    expect(touchTarget?.className).toContain('w-11');
  });
});
