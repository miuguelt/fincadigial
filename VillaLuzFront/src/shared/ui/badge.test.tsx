import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Badge from './badge';

describe('Badge Component', () => {
  it('renderiza con el texto proporcionado', () => {
    render(<Badge>Activo</Badge>);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('aplica la variante correcta', () => {
    const { container } = render(<Badge variant="success">Exito</Badge>);
    expect(container.firstChild).toHaveClass('bg-success-100');
  });

  it('aplica el tamano correcto', () => {
    const { container } = render(<Badge size="md">Mediano</Badge>);
    expect(container.firstChild).toHaveClass('text-sm');
  });

  it('permite anadir clases personalizadas', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('custom-class');
  });
});
