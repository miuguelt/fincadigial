import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimalDetailModal } from './AnimalDetailModal';
import { animalsService } from '@/entities/animal/api/animal.service';

vi.mock('@/entities/animal/api/animal.service', () => ({
  animalsService: {
    getById: vi.fn(),
    getAnimalsPaginated: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/entities/breed/api/breeds.service', () => ({
  breedsService: {
    getBreeds: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/features/auth/model/useAuth', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('./AnimalModalContent', () => ({
  AnimalModalContent: ({ animal, onFatherClick, onMotherClick }: any) => (
    <div data-testid={`modal-content-${animal.id}`}>
      <span>Animal: {animal.record || animal.id}</span>
      <button
        data-testid={`open-father-${animal.id}`}
        onClick={() => onFatherClick?.(99)}
      >
        Abrir Padre
      </button>
      <button
        data-testid={`open-mother-${animal.id}`}
        onClick={() => onMotherClick?.(88)}
      >
        Abrir Madre
      </button>
    </div>
  ),
}));

describe('AnimalDetailModal - Pila de Modales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre el detalle modal del padre en pila sobre el modal actual sin cerrarlo', async () => {
    const parentAnimal = {
      id: 99,
      record: 'BOV-009',
      sex: 'Macho',
      birth_date: '2020-01-01',
      weight: 600,
    };

    (animalsService.getById as any).mockResolvedValue(parentAnimal);

    const baseAnimal = {
      id: 10,
      record: 'TERNERO-010',
      sex: 'Macho',
      birth_date: '2024-01-01',
      weight: 150,
      idFather: 99,
    };

    render(
      <AnimalDetailModal
        isOpen={true}
        onOpenChange={vi.fn()}
        animal={baseAnimal}
      />
    );

    // Modal base presente
    expect(screen.getByTestId('modal-content-10')).toBeInTheDocument();
    expect(screen.getByText('Animal: TERNERO-010')).toBeInTheDocument();

    // Click en abrir padre
    const openFatherBtn = screen.getByTestId('open-father-10');
    fireEvent.click(openFatherBtn);

    // Esperar a que el modal del padre se monte en pila
    await waitFor(() => {
      expect(screen.getByTestId('modal-content-99')).toBeInTheDocument();
    });

    // AMBOS modales existen en el DOM (en pila)
    expect(screen.getByTestId('modal-content-10')).toBeInTheDocument();
    expect(screen.getByTestId('modal-content-99')).toBeInTheDocument();
    expect(screen.getByText('Animal: BOV-009')).toBeInTheDocument();
  });
});
