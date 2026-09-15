import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HerdHealthSection from './HerdHealthSection';

describe('HerdHealthSection', () => {
  it('explica que faltan controles cuando no existe evidencia para la tendencia', () => {
    render(
      <HerdHealthSection
        cards={[
          {
            id: 'health_index',
            titulo: 'Índice de Salud',
            valor: 80,
            unidad: '%',
          },
        ]}
        ventanaDias={30}
        trend={[
          { name: 'Sem 1', value: null },
          { name: 'Sem 2', value: null },
          { name: 'Sem 3', value: null },
          { name: 'Sem 4', value: null },
        ]}
        onOpenAnalytics={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Aún no hay controles suficientes para mostrar una tendencia.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Registra controles para comenzar/i)).toBeInTheDocument();
    expect(document.querySelector('.recharts-responsive-container')).toBeNull();
  });

  it('no muestra una variación si la API no entrega una comparación', () => {
    render(
      <HerdHealthSection
        cards={[
          {
            id: 'health_index',
            titulo: 'Índice de Salud',
            valor: 80,
            unidad: '%',
          },
        ]}
        trend={[]}
        onOpenAnalytics={vi.fn()}
      />,
    );

    expect(screen.queryByText('0%')).toBeNull();
  });

  it('usa la ventana entregada por la API en el texto de la tendencia', () => {
    render(
      <HerdHealthSection
        cards={[]}
        ventanaDias={14}
        trend={[{ name: 'Sem 1', value: 70 }, { name: 'Sem 2', value: 75 }]}
        onOpenAnalytics={vi.fn()}
      />,
    );

    expect(screen.getByText('Evolución de los últimos 14 días')).toBeInTheDocument();
  });
});
