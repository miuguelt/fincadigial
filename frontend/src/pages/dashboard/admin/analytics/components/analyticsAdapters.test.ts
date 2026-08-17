import { describe, expect, it } from 'vitest';
import {
  getDiseaseLabel,
  getExecutiveProductionViewModel,
  getBreedLabel,
  getTotalInseminations,
  summarizeWaterMeasurements,
} from './analyticsAdapters';

describe('analytics adapters', () => {
  it('lee el nombre de raza que entrega el endpoint de estadísticas', () => {
    expect(getBreedLabel({ breed: 'Angus' }, 0)).toBe('Angus');
  });

  it('lee diagnosis para mostrar los casos sanitarios', () => {
    expect(getDiseaseLabel({ diagnosis: 'Mastitis' })).toBe('Mastitis');
  });

  it('adapta las métricas productivas calculadas por el backend', () => {
    expect(getExecutiveProductionViewModel({
      field_metrics: {
        total_fields: 4,
        utilization_percent: 62.5,
        animals_per_field: 12.5,
      },
      productivity_metrics: {
        average_daily_gain_kg: 0.42,
        total_animals_analyzed: 18,
        best_daily_gain_kg: 0.8,
      },
      financial_metrics: { monthly_expenses: 150000 },
    })).toEqual({
      totalFields: 4,
      fieldUtilization: 62.5,
      animalsPerField: 12.5,
      averageDailyGainKg: 0.42,
      animalsAnalyzed: 18,
      bestDailyGainKg: 0.8,
      monthlyExpenses: 150000,
    });
  });

  it('no clasifica como crítico un conjunto sin mediciones hídricas', () => {
    expect(summarizeWaterMeasurements([])).toEqual({
      hasMeasurements: false,
      avgLevel: null,
      avgPh: null,
    });
  });

  it('desenvuelve el sobre paginado que entrega la API de mediciones hídricas', () => {
    expect(summarizeWaterMeasurements({
      data: [
        { level_percent: 40, ph: 6.8 },
        { level_percent: 80, ph: 7.2 },
      ],
      meta: { pagination: { total: 2 } },
    })).toEqual({
      hasMeasurements: true,
      avgLevel: 60,
      avgPh: 7,
    });
  });

  it('usa el total de eventos reproductivos de la base de datos, no solo el top cinco visible', () => {
    expect(getTotalInseminations({
      total_inseminations: 265,
      events_by_month: { '2026-01': 100, '2026-02': 165 },
      top_females: [{ inseminations: 1 }],
    })).toBe(265);
  });
});
