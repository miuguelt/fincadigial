import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { NewTransactionModal } from './NewTransactionModal';

describe('NewTransactionModal', () => {
  it('usa la fecha de Colombia como valor inicial y límite max', () => {
    const today = getTodayColombia();
    render(<NewTransactionModal onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    const dateInput = screen.getByLabelText(/fecha/i);
    expect(dateInput).toHaveValue(today);
    expect(dateInput).toHaveAttribute('max', today);
  });

  it('bloquea montos menores o iguales a cero sin enviar el formulario', () => {
    const onSubmit = vi.fn();
    render(<NewTransactionModal onClose={vi.fn()} onSubmit={onSubmit} submitting={false} />);

    const amountInput = screen.getByLabelText(/monto en pesos/i);
    fireEvent.change(amountInput, { target: { value: '0' } });
    fireEvent.submit(amountInput.closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(amountInput, { target: { value: '-5000' } });
    fireEvent.submit(amountInput.closest('form')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mantiene scroll móvil y botón cerrar táctil de 44 px', () => {
    render(<NewTransactionModal onClose={vi.fn()} onSubmit={vi.fn()} submitting={false} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-h-[90dvh]');

    const closeBtn = screen.getByRole('button', { name: /cerrar/i });
    expect(closeBtn.className).toContain('h-11');
    expect(closeBtn.className).toContain('w-11');
  });
});
