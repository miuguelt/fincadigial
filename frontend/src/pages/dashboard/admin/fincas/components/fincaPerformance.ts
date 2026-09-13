import type { FarmAdminKpis } from '../types';

export interface FincaPerformanceRow {
  finca_id: number;
  kpis?: FarmAdminKpis;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const optionalNumber = (value: unknown) => (isFiniteNumber(value) ? value : undefined);

const normalizeKpis = (raw: unknown): FarmAdminKpis | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  return {
    total_animals: optionalNumber(source.total_animals),
    total_animals_females: optionalNumber(source.total_animals_females),
    total_animals_males: optionalNumber(source.total_animals_males),
    total_milk_liters: optionalNumber(source.total_milk_liters),
    total_income: optionalNumber(source.total_income),
    total_expenses: optionalNumber(source.total_expenses),
    net_balance: optionalNumber(source.net_balance),
    total_fields: optionalNumber(source.total_fields),
    total_fields_area: optionalNumber(source.total_fields_area),
  };
};

/** Indexa únicamente respuestas confiables del comparativo de fincas. */
export const normalizeFincaPerformanceRows = (raw: unknown): Map<number, FarmAdminKpis> => {
  if (!Array.isArray(raw)) return new Map();

  return new Map(
    raw.flatMap((item: unknown) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const fincaId = row.finca_id;
      if (!isFiniteNumber(fincaId) || !Number.isInteger(fincaId) || fincaId <= 0) return [];
      const kpis = normalizeKpis(row.kpis);
      return kpis ? [[fincaId, kpis] as const] : [];
    }),
  );
};

export const formatFincaNumber = (value?: number) =>
  isFiniteNumber(value) ? Math.round(value).toLocaleString('es-CO') : '—';

export const formatFincaMoney = (value?: number) =>
  isFiniteNumber(value) ? `${value < 0 ? '-' : ''}$${formatFincaNumber(Math.abs(value))}` : '—';

/** Versión corta para tarjetas estrechas; la ficha conserva la cifra exacta. */
export const formatFincaMoneyShort = (value?: number) => {
  if (!isFiniteNumber(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `${sign}$${(absolute / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  }
  if (absolute >= 1_000) {
    return `${sign}$${(absolute / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil`;
  }
  return formatFincaMoney(value);
};

export const formatFincaDecimal = (value?: number) =>
  isFiniteNumber(value)
    ? value.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : '—';

export const calculateAnimalsPerField = (animals?: number, fields?: number) =>
  isFiniteNumber(animals) && isFiniteNumber(fields) && fields > 0
    ? formatFincaDecimal(animals / fields)
    : '—';

export const formatFincaLiters = (value?: number) =>
  isFiniteNumber(value) ? `${formatFincaNumber(value)} L` : '—';
