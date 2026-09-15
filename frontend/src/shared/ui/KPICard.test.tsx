import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KPICard } from './KPICard';
import { Heart } from 'lucide-react';

describe('KPICard Component', () => {
  it('renderiza la etiqueta y el valor correctamente', () => {
    render(<KPICard label="Preñeces Activas" value={23} subtitle="Hembras gestantes confirmadas" icon={Heart} />);
    expect(screen.getByText('Preñeces Activas')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('Hembras gestantes confirmadas')).toBeInTheDocument();
  });

  it('formatea números según locale es-CO', () => {
    render(<KPICard label="Total Kilos" value={15000} />);
    expect(screen.getByText('15.000')).toBeInTheDocument();
  });

  it('renderiza en modo compacto', () => {
    render(<KPICard compact label="Compact Stat" value={10} status="success" />);
    expect(screen.getByText('Compact Stat')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('muestra indicador de carga si loading=true', () => {
    render(<KPICard label="Cargando Stat" value={50} loading />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });
});
