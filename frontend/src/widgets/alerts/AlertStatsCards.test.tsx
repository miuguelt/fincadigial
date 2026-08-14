import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AlertStats } from '@/entities/alert/api/alert.service';
import { AlertStatsCards } from './AlertStatsCards';

const baseStats: AlertStats = {
  total: 240,
  unread: 201,
  critical: 12,
  criticalUnread: 7,
  high: 40,
  medium: 100,
  low: 88,
  by_type: { Salud: 120, Reproducción: 80, Crecimiento: 40 },
};

describe('AlertStatsCards', () => {
  it('muestra el total del servidor, no el tamaño de la página', () => {
    render(<AlertStatsCards stats={baseStats} total={50} unreadCount={201} criticalCount={7} />);
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('201')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // tipos activos
  });

  it('nunca muestra un porcentaje de lectura negativo', () => {
    // Escenario de la regresión: total de una fuente (página de 50) y
    // sin leer de otra (lista de 201) producía "-302% leídas".
    render(
      <AlertStatsCards
        stats={{ ...baseStats, total: 50, unread: 201 }}
        total={50}
        unreadCount={201}
        criticalCount={7}
      />
    );
    const badge = screen.getByText(/% leídas/);
    const value = Number(badge.textContent?.replace(/[^\d-]/g, ''));
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it('cae a los conteos locales mientras no llegan las estadísticas', () => {
    render(<AlertStatsCards stats={null} total={12} unreadCount={5} criticalCount={2} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
