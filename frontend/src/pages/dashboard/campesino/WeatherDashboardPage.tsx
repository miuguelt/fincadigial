import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  RefreshCw,
  ArrowLeft,
  CloudAlert,
  ShieldCheck,
} from 'lucide-react';
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
  const navigate = useNavigate();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6 md:space-y-8">
        
        {/* Barra de navegación superior rápida */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border/50">
          <button
            type="button"
            onClick={() => navigate('/campesino')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Mi Panel Campesino
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/campesino/climate-alerts')}
              className="rounded-xl text-xs gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/40"
            >
              <CloudAlert className="w-3.5 h-3.5" />
              Ver Alertas de Clima y Riesgos
            </Button>
          </div>
        </div>

        {/* Encabezado principal */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                🌤️ Estación Meteorológica y Pronóstico
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Fuente Oficial: Open-Meteo Satelital
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Monitoreo en tiempo real de temperatura, precipitaciones, humedad y decisiones agronómicas para <span className="font-semibold text-foreground">{fincaName}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setGpsModalOpen(true)}
              className="rounded-xl gap-1.5 text-xs sm:text-sm"
            >
              <MapPin className="w-4 h-4 text-primary" />
              {hasCoordinates ? 'Ajustar coordenadas GPS' : 'Configurar coordenadas GPS'}
            </Button>
            <Button
              onClick={refreshNow}
              disabled={updating || !hasCoordinates}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shadow-md text-xs sm:text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Actualizando...' : 'Actualizar clima'}
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
            await refreshNow();
          }}
        />
      )}
    </div>
  );
};

export default WeatherDashboardPage;
