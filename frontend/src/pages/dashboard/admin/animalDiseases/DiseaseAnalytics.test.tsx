import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DiseaseAnalytics } from './DiseaseAnalytics';

describe('DiseaseAnalytics', () => {
  it('muestra estados vacíos cuando no hay episodios', () => {
    render(<DiseaseAnalytics stats={null} loading={false} />);
    expect(screen.getByText(/Aún no hay casos registrados/)).toBeInTheDocument();
  });

  it('renderiza métricas cuando hay episodios', () => {
    render(
      <DiseaseAnalytics
        loading={false}
        stats={{
          total: 5,
          active: 2,
          resolved: 3,
          recovery_rate: 60,
          avg_duration_days: 7.5,
          by_status: { Activo: 2, Recuperado: 3 },
          by_severity: { Leve: 2, Severa: 3 },
          by_month: [
            { period: '2026-08', count: 2 },
            { period: '2026-09', count: 3 },
          ],
          avg_duration_by_disease: [
            { disease: 'Mastitis', avg_days: 6.0, cases: 2 },
            { disease: 'Fiebre aftosa', avg_days: 9.0, cases: 1 },
          ],
        }}
      />
    );

    expect(screen.getAllByText(/Casos nuevos por mes/).length).toBeGreaterThan(0);
    expect(screen.getByText('Mastitis')).toBeInTheDocument();
    expect(screen.getByText('7.5 días')).toBeInTheDocument();
  });
});
