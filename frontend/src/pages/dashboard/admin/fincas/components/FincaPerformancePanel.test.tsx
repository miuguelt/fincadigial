import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FincaPerformancePanel from './FincaPerformancePanel';
import type { FarmAdminKpis } from '../types';

const mockKpis: FarmAdminKpis = {
  total_animals: 3,
  total_fields: 2,
  total_fields_area: 15.5,
  total_milk_liters: 9,
  total_income: 1200000,
  total_expenses: 800000,
  net_balance: 400000,
};

describe('FincaPerformancePanel', () => {
  it('renderiza en modo compacto con los 3 indicadores principales y clases anti-desborde', () => {
    const { container } = render(
      <FincaPerformancePanel kpis={mockKpis} compact />
    );

    // Debe mostrar los indicadores de ganado, leche y balance
    expect(screen.getByText('Ganado')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('vivos')).toBeInTheDocument();

    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(screen.getByText(/9/)).toBeInTheDocument();
    expect(screen.getByText('acumulada')).toBeInTheDocument();

    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('positivo')).toBeInTheDocument();

    // Las tarjetas deben incluir clases de protección contra desborde
    const metricCards = container.querySelectorAll('.overflow-hidden');
    expect(metricCards.length).toBeGreaterThanOrEqual(3);

    // Los labels deben tener la clase truncate para no salirse de la tarjeta
    const ganadoLabel = screen.getByText('Ganado');
    expect(ganadoLabel.className).toContain('truncate');
  });

  it('renderiza en modo extendido con los 6 indicadores y métricas calculadas', () => {
    render(<FincaPerformancePanel kpis={mockKpis} compact={false} />);

    expect(screen.getByText('Medición operativa')).toBeInTheDocument();
    expect(screen.getByText('Ganado vivo')).toBeInTheDocument();
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Gastos')).toBeInTheDocument();
    expect(screen.getByText('Balance neto')).toBeInTheDocument();
    expect(screen.getByText('Potreros')).toBeInTheDocument();

    // Métricas calculadas
    expect(screen.getByText('Animales por potrero')).toBeInTheDocument();
    expect(screen.getByText('Leche por animal')).toBeInTheDocument();
    expect(screen.getByText('Margen neto')).toBeInTheDocument();
  });

  it('muestra estado de carga accesible cuando loading es true', () => {
    render(<FincaPerformancePanel loading />);
    expect(screen.getByText(/Consultando indicadores de rendimiento/i)).toBeInTheDocument();
  });

  it('muestra mensaje de error cuando error es true', () => {
    render(<FincaPerformancePanel error />);
    expect(screen.getByText(/No se pudieron cargar los indicadores/i)).toBeInTheDocument();
  });

  it('muestra aviso de indicadores no disponibles cuando no hay kpis', () => {
    render(<FincaPerformancePanel />);
    expect(screen.getByText(/Indicadores aún no disponibles/i)).toBeInTheDocument();
  });
});
