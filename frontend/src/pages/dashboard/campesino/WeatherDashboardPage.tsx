import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  RefreshCw,
  ArrowLeft,
  CloudAlert,
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
import { CampesinoViewShell } from '@/widgets/layout/CampesinoViewShell';

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
      <CampesinoViewShell
        title="Estación meteorológica y pronóstico"
        description={`Monitoreo del clima local para ${fincaName}.`}
        icon={<CloudAlert className="h-5 w-5 text-white" aria-hidden="true" />}
        leading={(
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={() => navigate('/campesino')} aria-label="Volver a mi panel">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
      >
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        </div>
      </CampesinoViewShell>
    );
  }

  return (
    <CampesinoViewShell
      title="Estación meteorológica y pronóstico"
      description={<>Monitoreo en tiempo real de temperatura, precipitaciones, humedad y decisiones agronómicas para <span className="font-semibold text-foreground">{fincaName}</span>.</>}
      icon={<CloudAlert className="h-5 w-5 text-white" aria-hidden="true" />}
      leading={(
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={() => navigate('/campesino')} aria-label="Volver a mi panel">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      actions={(
        <>
          <Button
            variant="outline"
            onClick={() => navigate('/campesino/climate-alerts')}
            className="h-11 w-full gap-1.5 rounded-xl text-xs sm:w-auto sm:text-sm"
          >
            <CloudAlert className="h-4 w-4" />
            Ver alertas de clima
          </Button>
            <Button
              variant="outline"
              onClick={() => setGpsModalOpen(true)}
              className="h-11 w-full gap-1.5 rounded-xl text-xs sm:w-auto sm:text-sm"
            >
              <MapPin className="h-4 w-4 text-primary" />
              {hasCoordinates ? 'Ajustar coordenadas GPS' : 'Configurar coordenadas GPS'}
            </Button>
            <Button
              onClick={refreshNow}
              disabled={updating || !hasCoordinates}
              className="h-11 w-full gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs shadow-md hover:bg-primary/90 sm:w-auto sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Actualizando...' : 'Actualizar clima'}
            </Button>
        </>
      )}
    >

      <div className="space-y-6">
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
    </CampesinoViewShell>
  );
};

export default WeatherDashboardPage;
