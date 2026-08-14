import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import KPICard from '@/widgets/analytics/KPICard';

/**
 * Guarda del estándar de pantallas de datos.
 * Ver docs/estandar-pantallas-de-datos.md.
 */
describe('DataScreenHeader', () => {
  it('pinta título, descripción, acciones, métricas e hijos', () => {
    render(
      <DataScreenHeader
        title="Tratamientos"
        description="Monitoreo clínico"
        leading={<button type="button">Volver</button>}
        actions={<span>Exportar</span>}
        metrics={<KPICard compact title="Total" value={7} />}
      >
        <nav>Pestañas</nav>
      </DataScreenHeader>,
    );

    expect(screen.getByRole('heading', { name: 'Tratamientos' })).toBeInTheDocument();
    expect(screen.getByText('Monitoreo clínico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
    expect(screen.getByText('Exportar')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Pestañas')).toBeInTheDocument();
  });

  it('no reintroduce el encabezado de landing (radio y relleno grandes)', () => {
    const { container } = render(<DataScreenHeader title="Ganado" />);
    const header = container.firstElementChild?.firstElementChild;

    expect(header?.className).toContain('py-3');
    expect(header?.className).not.toContain('rounded-[2.5rem]');
    expect(header?.className).not.toContain('sm:p-8');
  });
});

describe('KPICard compact', () => {
  it('omite el sparkline para no robarle alto a la tabla', () => {
    const { container } = render(<KPICard compact title="Total" value={12} />);

    expect(container.querySelector('.recharts-responsive-container')).toBeNull();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('conserva el sparkline en la variante completa de los dashboards', () => {
    const { container } = render(<KPICard title="Total" value={12} />);

    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull();
  });
});
