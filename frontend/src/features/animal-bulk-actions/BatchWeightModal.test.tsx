import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchWeightModal } from './BatchWeightModal';
import { animalsService } from '@/entities/animal/api/animal.service';

const mockShowToast = vi.fn();

vi.mock('@/app/providers/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    bulkWeight: vi.fn(),
  },
}));

describe('BatchWeightModal — Pruebas de Integración y Usabilidad Móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente el modal de pesaje masivo con información de lote', () => {
    render(
      <BatchWeightModal
        isOpen={true}
        onClose={vi.fn()}
        selectedAnimalIds={[1, 2, 3]}
        onSuccess={vi.fn()}
      />
    );

    // Debe mostrar el título del modal y la cantidad de animales con terminología colombiana
    expect(screen.getByText(/Pesaje de Ganado/i)).toBeInTheDocument();
    expect(screen.getByText(/Animales/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmar Pesaje/i)).toBeInTheDocument();
  });

  it('deshabilita el botón de confirmar pesaje cuando el peso está vacío', () => {
    render(
      <BatchWeightModal
        isOpen={true}
        onClose={vi.fn()}
        selectedAnimalIds={[10, 11]}
        onSuccess={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Confirmar Pesaje/i });
    expect(submitButton).toBeDisabled();
  });

  it('habilita el botón y envía el pesaje masivo al ingresar un valor válido', async () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    (animalsService.bulkWeight as any).mockResolvedValue({
      success: true,
      message: 'Pesajes registrados',
      data: [{ id: 1, weight: 350 }],
    });

    render(
      <BatchWeightModal
        isOpen={true}
        onClose={mockOnClose}
        selectedAnimalIds={[101, 102]}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '380.5' } });

    const submitButton = screen.getByRole('button', { name: /Confirmar Pesaje/i });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(animalsService.bulkWeight).toHaveBeenCalledWith(
        expect.objectContaining({
          animal_ids: [101, 102],
          weight: 380.5,
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Pesaje registrado para 2 animales'),
        'success'
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('permite seleccionar un peso predefinido desde los chips sugeridos', async () => {
    render(
      <BatchWeightModal
        isOpen={true}
        onClose={vi.fn()}
        selectedAnimalIds={[5]}
        onSuccess={vi.fn()}
      />
    );

    const chip320 = screen.getByText('320');
    fireEvent.click(chip320);

    const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(input.value).toBe('320');

    const submitButton = screen.getByRole('button', { name: /Confirmar Pesaje/i });
    expect(submitButton).not.toBeDisabled();
  });
});
