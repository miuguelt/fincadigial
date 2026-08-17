export interface ExecutiveProductionViewModel {
  totalFields: number | null;
  fieldUtilization: number | null;
  animalsPerField: number | null;
  averageDailyGainKg: number | null;
  animalsAnalyzed: number | null;
  bestDailyGainKg: number | null;
  monthlyExpenses: number | null;
}

const finiteNumberOrNull = (value: unknown): number | null => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export const getBreedLabel = (breed: any, index = 0): string =>
  breed?.breed ?? breed?.breed_name ?? breed?.raza ?? breed?.name ?? `Raza ${index + 1}`;

export const getDiseaseLabel = (disease: any): string =>
  disease?.diagnosis ?? disease?.disease_name ?? disease?.description ?? 'Sin descripción';

export const getTotalInseminations = (fertilityStats: any): number => {
  const total = finiteNumberOrNull(fertilityStats?.total_inseminations);
  if (total !== null) return total;

  const monthlyTotal = Object.values(fertilityStats?.events_by_month ?? {}).reduce(
    (sum: number, count: unknown) => sum + (finiteNumberOrNull(count) ?? 0),
    0,
  );
  return monthlyTotal;
};

export const getExecutiveProductionViewModel = (productionStats: any): ExecutiveProductionViewModel => {
  const fieldMetrics = productionStats?.field_metrics ?? {};
  const productivityMetrics = productionStats?.productivity_metrics ?? {};
  const financialMetrics = productionStats?.financial_metrics ?? {};

  return {
    totalFields: finiteNumberOrNull(fieldMetrics.total_fields ?? productionStats?.total_fields),
    fieldUtilization: finiteNumberOrNull(fieldMetrics.utilization_percent ?? productionStats?.field_utilization),
    animalsPerField: finiteNumberOrNull(fieldMetrics.animals_per_field ?? productionStats?.animals_per_field),
    averageDailyGainKg: finiteNumberOrNull(productivityMetrics.average_daily_gain_kg),
    animalsAnalyzed: finiteNumberOrNull(productivityMetrics.total_animals_analyzed),
    bestDailyGainKg: finiteNumberOrNull(productivityMetrics.best_daily_gain_kg),
    monthlyExpenses: finiteNumberOrNull(financialMetrics.monthly_expenses ?? productionStats?.monthly_costs),
  };
};

export const summarizeWaterMeasurements = (measurements: unknown): {
  hasMeasurements: boolean;
  avgLevel: number | null;
  avgPh: number | null;
} => {
  const unwrapRows = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];

    const envelope = value as Record<string, unknown>;
    if (Array.isArray(envelope.data)) return envelope.data;
    if (Array.isArray(envelope.items)) return envelope.items;

    // Algunas capas de transporte conservan el AxiosResponse completo:
    // { data: { data: [...], meta: {...} } }.
    return unwrapRows(envelope.data);
  };

  const rows = unwrapRows(measurements);
  const levels = rows
    .map((row: any) => row?.level_percent == null ? Number.NaN : Number(row.level_percent))
    .filter(Number.isFinite);
  const phValues = rows
    .map((row: any) => row?.ph == null ? Number.NaN : Number(row.ph))
    .filter(Number.isFinite);

  return {
    hasMeasurements: rows.length > 0,
    avgLevel: levels.length > 0
      ? Math.round(levels.reduce((sum, value) => sum + value, 0) / levels.length)
      : null,
    avgPh: phValues.length > 0
      ? Number((phValues.reduce((sum, value) => sum + value, 0) / phValues.length).toFixed(1))
      : null,
  };
};
