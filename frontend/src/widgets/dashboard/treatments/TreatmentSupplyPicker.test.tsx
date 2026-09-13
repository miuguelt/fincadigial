import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { TreatmentSupplyPicker } from './TreatmentSupplyPicker';

describe('TreatmentSupplyPicker', () => {
  it('filtra opciones, conserva la selección múltiple y expone el conteo', async () => {
    const onSelectedChange = vi.fn();

    render(
      <TreatmentSupplyPicker
        kind="medication"
        options={[
          { value: 1, label: 'Complejo B' },
          { value: 2, label: 'Antibiótico' },
        ]}
        search=""
        onSearchChange={vi.fn()}
        selected={[1]}
        onSelectedChange={onSelectedChange}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        saving={false}
        error={null}
      />,
    );

    expect(screen.getByText('1 medicamento seleccionado')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('listbox'), ['1', '2']);

    expect(onSelectedChange).toHaveBeenCalledWith([1, 2]);
  });
});
