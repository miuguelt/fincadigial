import { useMemo } from 'react';
import { cn } from '@/shared/ui/cn';
import { FincaIdentity } from './components/FincaIdentity';
import { HeroFooter } from './components/HeroFooter';
import { HeroSkeleton } from './components/HeroStates';
import { WeatherAlertsRow } from './components/WeatherAlertsRow';
import { WeatherMetric } from './components/WeatherMetric';
import { WeatherSlot } from './components/WeatherSlot';
import { useFincaHero } from './hooks/useFincaHero';
import { buildWeatherMetrics } from './utils/weatherMetrics';

/**
 * Banner de cabecera del dashboard: identifica la finca activa y muestra el
 * clima real de sus coordenadas, que es lo que decide la jornada en una finca
 * campesina (si llueve, si se puede fumigar, cuánta luz queda).
 *
 * Todos los valores vienen de PostgreSQL vía la API; cuando falta el dato se
 * muestra el estado correspondiente en vez de rellenar con números.
 */
export function FincaHeroBanner({ className }: { className?: string }) {
  const hero = useFincaHero();
  const { current } = hero;
  const metrics = useMemo(() => buildWeatherMetrics(current), [current]);

  if (!hero.fincaId) return null;
  if (hero.loading) return <HeroSkeleton />;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm',
        className,
      )}
      aria-label="Resumen de la finca y el clima"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-500" />

      <div className="space-y-4 p-3 pt-4 sm:p-5 sm:pt-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] xl:items-start">
          <FincaIdentity name={hero.fincaName} profile={hero.profile} location={hero.location} />
          <WeatherSlot
            record={current}
            hasCoordinates={hero.hasCoordinates}
            weatherError={hero.weatherError}
            refreshing={hero.refreshing}
            fincaName={hero.fincaName}
            onRefresh={hero.refreshWeather}
          />
        </div>

        {metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            {metrics.map((item) => (
              <WeatherMetric key={item.key} item={item} />
            ))}
          </div>
        )}

        <WeatherAlertsRow alerts={hero.alerts} />
        <HeroFooter />
      </div>
    </section>
  );
}

export default FincaHeroBanner;
