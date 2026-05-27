import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnimalCard } from './AnimalCard';

vi.mock('./AnimalImageBanner', () => ({
  AnimalImageBanner: () => <div data-testid="animal-image-banner" />
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('@/widgets/dashboard/AnimalActionsMenu', () => ({
  AnimalActionsMenu: () => <div data-testid="animal-actions-menu" />
}));

const mockAnimal = {
  id: 1,
  record: 'Lola-001',
  name: 'Lola',
  sex: 'Hembra',
  birth_date: '2023-01-01',
  weight: 250,
  status: 'Sano',
  current_field_name: 'Potrero 1',
  idFather: null,
  idMother: null
};

describe('AnimalCard', () => {
  it('renderiza la informacion basica del animal', () => {
    render(
      <AnimalCard
        animal={mockAnimal as any}
        breedLabel="Jersey"
        fatherLabel="N/A"
        motherLabel="N/A"
      />
    );
    expect(screen.getByText('Lola-001')).toBeInTheDocument();
    expect(screen.getByText('Jersey')).toBeInTheDocument();
    expect(screen.getByText('250k')).toBeInTheDocument();
    expect(screen.getAllByText('♀').length).toBeGreaterThanOrEqual(1);
  });

  it('llama a onCardClick cuando se hace click en la tarjeta', () => {
    const onCardClick = vi.fn();
    render(
      <AnimalCard
        animal={mockAnimal as any}
        breedLabel="Jersey"
        fatherLabel="N/A"
        motherLabel="N/A"
        onCardClick={onCardClick}
      />
    );
    fireEvent.click(screen.getByText('Lola-001').closest('div')!);
  });

  it('muestra el badge de alerta si alertCount > 0', () => {
    render(
      <AnimalCard
        animal={mockAnimal as any}
        breedLabel="Jersey"
        fatherLabel="N/A"
        motherLabel="N/A"
        alertCount={3}
      />
    );
    expect(screen.getByText('3!')).toBeInTheDocument();
  });

  it('maneja el click en el padre si se proporciona onFatherClick', () => {
    const onFatherClick = vi.fn();
    const animalWithFather = { ...mockAnimal, idFather: 10 };
    render(
      <AnimalCard
        animal={animalWithFather as any}
        breedLabel="Jersey"
        fatherLabel="Padre Famoso"
        motherLabel="N/A"
        onFatherClick={onFatherClick}
      />
    );
    const fatherButton = screen.getByText('Padre Famoso');
    fireEvent.click(fatherButton);
    expect(onFatherClick).toHaveBeenCalledWith(10);
  });
});
