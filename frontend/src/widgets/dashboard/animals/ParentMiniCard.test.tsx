import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ParentMiniCard } from './ParentMiniCard';

vi.mock('@/entities/animal/api/animalImage.service', () => ({
  animalImageService: {
    getAnimalImages: vi.fn().mockResolvedValue({ success: true, data: { images: [] } }),
  },
}));

describe('ParentMiniCard', () => {
  it('muestra estado sin registro cuando no tiene parentId', () => {
    render(
      <ParentMiniCard
        parentId={null}
        parentLabel="-"
        gender="Padre"
      />
    );
    expect(screen.getByText('Padre')).toBeInTheDocument();
    expect(screen.getByText('Sin registro')).toBeInTheDocument();
  });

  it('renderiza información del progenitor y el badge Ver Ficha cuando es interactiva', () => {
    const handleClick = vi.fn();
    render(
      <ParentMiniCard
        parentId={9}
        parentLabel="BOV-009"
        gender="Padre"
        onClick={handleClick}
      />
    );

    expect(screen.getByText('Padre')).toBeInTheDocument();
    expect(screen.getByText('BOV-009')).toBeInTheDocument();
    expect(screen.getByText('Ver Ficha')).toBeInTheDocument();

    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
