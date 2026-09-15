import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SectionHeader } from './SectionHeader';
import { ShieldAlert } from 'lucide-react';

describe('SectionHeader Component', () => {
  it('renderiza título y descripción', () => {
    render(<SectionHeader title="Alertas Sanitarias" description="Listado de eventos de salud" icon={ShieldAlert} />);
    expect(screen.getByText('Alertas Sanitarias')).toBeInTheDocument();
    expect(screen.getByText('Listado de eventos de salud')).toBeInTheDocument();
  });

  it('renderiza acciones en el slot derecho', () => {
    render(
      <SectionHeader
        title="Sección con botón"
        actions={<button>Acción</button>}
      />
    );
    expect(screen.getByText('Acción')).toBeInTheDocument();
  });
});
