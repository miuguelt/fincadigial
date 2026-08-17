import { describe, expect, it } from 'vitest';
import {
  buildVaccinationSeries,
  shouldRefreshVaccinationAnalytics,
  summarizeVaccinationSeries,
} from './vaccinationAnalytics';

describe('vaccinationAnalytics', () => {
  it('completa los meses sin registros con cero y conserva el orden cronológico', () => {
    const series = buildVaccinationSeries(
      [
        { period: '2026-05', count: 4 },
        { period: '2026-07', count: 2 },
      ],
      4,
      new Date(2026, 7, 17),
    );

    expect(series.map(({ period, count }) => ({ period, count }))).toEqual([
      { period: '2026-05', count: 4 },
      { period: '2026-06', count: 0 },
      { period: '2026-07', count: 2 },
      { period: '2026-08', count: 0 },
    ]);
    expect(series.every(({ label }) => label.length > 0)).toBe(true);
  });

  it('calcula total, promedio, mes pico y actividad reciente a partir de la serie real', () => {
    const summary = summarizeVaccinationSeries(
      [
        { period: '2026-05', label: 'may', count: 4 },
        { period: '2026-06', label: 'jun', count: 0 },
        { period: '2026-07', label: 'jul', count: 2 },
      ],
      { total: 17, recent_today: 1 },
    );

    expect(summary).toEqual({
      periodTotal: 6,
      averagePerMonth: 2,
      peakMonth: { period: '2026-05', label: 'may', count: 4 },
      activeMonths: 2,
      total: 17,
      recentToday: 1,
    });
  });

  it('reconoce los eventos de vacunaciones que deben invalidar el resumen', () => {
    expect(shouldRefreshVaccinationAnalytics({ resource: 'vaccinations', local: false })).toBe(true);
    expect(shouldRefreshVaccinationAnalytics({ endpoint: 'analytics/health/statistics' })).toBe(true);
    expect(shouldRefreshVaccinationAnalytics({ resource: 'inventory', local: false })).toBe(false);
  });
});
