export interface VaccinationMonthlyRecord {
  period?: string;
  count?: number | string | null;
}

export interface VaccinationMonthlyPoint {
  period: string;
  label: string;
  count: number;
}

export interface VaccinationStats {
  total?: number | string | null;
  recent_today?: number | string | null;
}

export interface VaccinationRefreshDetail {
  resource?: unknown;
  endpoint?: unknown;
  local?: unknown;
}

export interface VaccinationSummary {
  periodTotal: number;
  averagePerMonth: number;
  peakMonth: VaccinationMonthlyPoint | null;
  activeMonths: number;
  total: number;
  recentToday: number;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-CO', { month: 'short' });

const toSafeNumber = (value: number | string | null | undefined): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatMonth = (date: Date): string =>
  MONTH_FORMATTER.format(date).replace('.', '');

export function shouldRefreshVaccinationAnalytics(
  detail: VaccinationRefreshDetail,
): boolean {
  const targets = [detail.resource, detail.endpoint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return detail.local === true || targets.includes('vaccination') || targets.includes('analytics/health');
}

export function buildVaccinationSeries(
  records: VaccinationMonthlyRecord[],
  months = 12,
  referenceDate = new Date(),
): VaccinationMonthlyPoint[] {
  const safeMonths = Math.max(1, Math.floor(months));
  const counts = new Map(
    records
      .filter((record) => Boolean(record.period))
      .map((record) => [record.period as string, toSafeNumber(record.count)]),
  );

  return Array.from({ length: safeMonths }, (_, index) => {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - safeMonths + 1 + index,
      1,
    );
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    return {
      period,
      label: formatMonth(date),
      count: counts.get(period) ?? 0,
    };
  });
}

export function summarizeVaccinationSeries(
  series: VaccinationMonthlyPoint[],
  stats: VaccinationStats = {},
): VaccinationSummary {
  const periodTotal = series.reduce((total, point) => total + point.count, 0);
  const peakMonth = series.reduce<VaccinationMonthlyPoint | null>(
    (peak, point) => (point.count > (peak?.count ?? 0) ? point : peak),
    null,
  );

  return {
    periodTotal,
    averagePerMonth: series.length ? Number((periodTotal / series.length).toFixed(1)) : 0,
    peakMonth: peakMonth?.count ? peakMonth : null,
    activeMonths: series.filter((point) => point.count > 0).length,
    total: toSafeNumber(stats.total),
    recentToday: toSafeNumber(stats.recent_today),
  };
}
