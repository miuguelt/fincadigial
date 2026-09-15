import { describe, expect, it } from 'vitest';
import {
  deriveFieldStats,
  deriveHealthGauge,
  deriveMilkStats,
  deriveWeightStats,
} from './useCampesinoEstadisticas';

describe('indicadores campesinos sin datos', () => {
  it('no convierte la ausencia de registros en salud, engorde o carga ficticios', () => {
    expect(deriveHealthGauge(undefined)).toMatchObject({
      value: null,
      status: 'unavailable',
      statusLabel: 'Sin datos suficientes',
    });
    expect(deriveWeightStats(undefined)).toMatchObject({
      adgKg: null,
      adgGrams: null,
      adgStatus: 'unavailable',
    });
    expect(deriveFieldStats(undefined)).toMatchObject({
      utilizationPercent: null,
      status: 'unavailable',
    });
    expect(deriveMilkStats(undefined)).toMatchObject({
      avgLitersPerCow: null,
      trend: 'unavailable',
    });
  });
});
