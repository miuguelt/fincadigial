import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, RefreshCcw, Snowflake, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { describeCondition, getWeatherKind } from '@/entities/weather';
import type { WeatherRecord } from '@/entities/weather';
import type { WeatherConditionKind } from '@/entities/weather';
import { cn } from '@/shared/ui/cn';

const KIND_ICON: Record<WeatherConditionKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
  snow: Snowflake,
  unknown: Cloud,
};

interface Props {
  record: WeatherRecord;
  refreshing: boolean;
  onRefresh: () => void;
}

/** Temperatura actual en grande: es el dato que se mira de reojo desde el celular. */
export function WeatherNow({ record, refreshing, onRefresh }: Props) {
  const kind = getWeatherKind(record.weather_code);
  const Icon = KIND_ICON[kind];
  const description = describeCondition(record.weather_condition, record.weather_code);
  const temperature =
    record.temperature_celsius === null || record.temperature_celsius === undefined
      ? '—'
      : Math.round(record.temperature_celsius);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-3 py-3 backdrop-blur-sm sm:px-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-14 sm:w-14">
        <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-3xl font-black leading-none tabular-nums text-foreground sm:text-4xl">
          {temperature}
          <span className="align-top text-lg font-bold sm:text-xl">°C</span>
        </p>
        <p className="mt-1 fit-clamp text-sm font-semibold text-foreground/80">{description}</p>
        <p className="fit-clamp text-[11px] text-muted-foreground">
          Medido{' '}
          {new Date(record.recorded_at).toLocaleString('es-CO', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        aria-label="Actualizar clima"
        title="Actualizar clima"
      >
        <RefreshCcw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
      </button>
    </div>
  );
}
