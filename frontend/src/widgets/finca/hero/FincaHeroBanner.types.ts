import type { LucideIcon } from 'lucide-react';

/** Datos administrativos de la finca activa (tabla `fincas`). */
export interface FincaHeroProfile {
  id: number;
  name: string;
  type?: string | null;
  department?: string | null;
  municipality?: string | null;
  address?: string | null;
  ica_registration?: string | null;
  nit?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type MetricTone = 'sky' | 'amber' | 'emerald' | 'violet' | 'rose' | 'slate';

/** Una casilla del panel climático. `value` ya viene formateado. */
export interface WeatherMetricItem {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: MetricTone;
}
