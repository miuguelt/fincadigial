/**
 * Contrato del panel de indicadores reproductivos del hato.
 *
 * Refleja la respuesta de `GET /reproduction/kpis`. Cada serie viene con su
 * meta y su semáforo ya resueltos en el servidor, para que la interfaz no
 * duplique el criterio agronómico.
 */

export type KpiStatus = 'ok' | 'warn' | 'bad';

/** Resumen estadístico de una serie con su meta de referencia. */
export interface KpiSeries {
  avg: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  n: number;
  target: number | null;
  status: KpiStatus | null;
}

/** Composición reproductiva del hato en el momento de la consulta. */
export interface ReproductiveInventory {
  total_females: number;
  breeding_females: number;
  heifers: number;
  pregnant: number;
  served_pending: number;
  open: number;
  lactating: number;
}

export interface TechniqueConception {
  services: number;
  conceptions: number;
  rate_pct: number | null;
}

export interface HerdEfficiency {
  calving_interval_days: KpiSeries;
  days_open: KpiSeries;
  calving_to_first_service_days: KpiSeries;
  services_per_conception: KpiSeries;
  age_at_first_calving_months: KpiSeries;

  total_services: number;
  resolved_services: number;
  pending_services: number;
  confirmed_pregnancies: number;
  conception_rate_pct: number | null;
  conception_by_technique: Record<string, TechniqueConception>;

  heat_detection_rate_pct: number | null;
  observed_heats: number;
  heat_opportunities: number;
  pregnancy_rate_pct: number | null;

  abortion_rate_pct: number | null;
  perinatal_mortality_pct: number | null;
  twinning_rate_pct: number | null;
  calving_complication_rate_pct: number | null;

  total_births: number;
  live_calves: number;
  dead_calves: number;
  calf_sex_ratio: { males: number; females: number };

  services_by_month: Record<string, number>;
  births_by_month: Record<string, number>;
}

/** Una hembra en una lista de atención, con el dato que la justifica. */
export interface RiskEntry {
  animal_id: number;
  record: string;
  days_open?: number;
  services_since_calving?: number;
  last_birth_date?: string | null;
  parity?: number;
  failed_services?: number;
  last_service_date?: string | null;
  age_months?: number | null;
  reason?: string;
  service_date?: string | null;
  days_since_service?: number;
  technique?: string | null;
  expected_birth_date?: string | null;
  days_overdue?: number;
  days_to_birth?: number;
  dry_off_date?: string | null;
  days_late?: number;
  sire_id?: number | null;
}

export type RiskListKey =
  | 'open_over_limit'
  | 'repeat_breeders'
  | 'heifers_without_service'
  | 'unconfirmed_services'
  | 'overdue_births'
  | 'due_for_dry_off'
  | 'upcoming_births';

export interface HerdKpis {
  period_months: number;
  as_of: string;
  targets: Record<string, { target: number; warn: number; direction: 'lower' | 'higher' }>;
  inventory: ReproductiveInventory;
  efficiency: HerdEfficiency;
  risk: Record<RiskListKey, RiskEntry[]>;
  projection: {
    births_by_month: Record<string, number>;
    dry_offs_by_month: Record<string, number>;
  };
  status: Record<string, KpiStatus | null>;
}
