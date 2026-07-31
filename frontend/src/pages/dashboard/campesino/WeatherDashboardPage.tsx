import React, { useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { FincaGpsModal } from '@/features/multi-finca/ui/FincaGpsModal';
import { useWeatherDashboard } from './hooks/useWeatherDashboard';
import { CurrentWeatherCards } from './components/weather/CurrentWeatherCards';
import { WeatherAlertsSection } from './components/weather/WeatherAlertsSection';
import { WeatherCharts } from './components/weather/WeatherCharts';
import { WeatherLocationBanner } from './components/weather/WeatherLocationBanner';
import { WeatherForecast } from './components/weather/WeatherForecast';
import { WeatherDecisionPanel } from './components/weather/WeatherDecisionPanel';

const WeatherDashboardPage: React.FC = () => {
  const {
    fincaId,
    fincaName,
    loading,
    updating,
    days,
    setDays,
    current,
    alerts,
    history,
    forecast,
    location,
    hasCoordinates,
    refreshNow,
    dismissAlert,
  } = useWeatherDashboard();

  const [gpsModalOpen, setGpsModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-background dark:from-blue-950/10 dark:to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-background dark:from-blue-950/10 dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">🌤️ Clima y Alertas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Datos automáticos de Open-Meteo para la ubicación de la finca
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setGpsModalOpen(true)}
              className="rounded-xl gap-1.5"
            >
              <MapPin className="w-4 h-4" />
              {hasCoordinates ? 'Ajustar ubicación' : 'Configurar ubicación'}
            </Button>
            <Button
              onClick={refreshNow}
              disabled={updating || !hasCoordinates}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        <WeatherLocationBanner
          fincaName={fincaName}
          location={location}
          hasCoordinates={hasCoordinates}
          lastUpdated={current?.recorded_at}
        />

        <CurrentWeatherCards current={current} />

        <WeatherDecisionPanel current={current} forecast={forecast} />

        {forecast?.daily?.length ? <WeatherForecast forecast={forecast.daily} /> : null}

        <WeatherCharts history={history} forecast={forecast} />

        <WeatherAlertsSection
          alerts={alerts}
          days={days}
          onDaysChange={setDays}
          onDismiss={dismissAlert}
        />
      </div>

      {fincaId && (
        <FincaGpsModal
          isOpen={gpsModalOpen}
          onClose={() => setGpsModalOpen(false)}
          fincaId={fincaId}
          fincaName={fincaName}
          initialCoordinates={location ?? undefined}
          onLocationUpdated={async () => {
            // Saving coordinates does not invalidate the old weather record by
            // itself; force a new provider request before closing the modal.
            await refreshNow();
          }}
        />
      )}
    </div>
  );
};

export default WeatherDashboardPage;
