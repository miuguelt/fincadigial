import { motion } from 'framer-motion';
import { CloudRain, Droplets, RefreshCw, ShieldCheck, Sun, Thermometer, Wind } from 'lucide-react';
import type { WeatherAlert, WeatherRecord } from '@/entities/weather';
import { Button } from '@/shared/ui/button';

interface ClimateLiveWeatherCardProps {
  currentWeather: WeatherRecord | null;
  stationAlerts: WeatherAlert[];
  fincaId?: number;
  refreshingWeather: boolean;
  onRefresh: () => void | Promise<void>;
  navigate: (path: string) => void;
}

export function ClimateLiveWeatherCard({
  currentWeather, stationAlerts, fincaId, refreshingWeather, onRefresh, navigate,
}: ClimateLiveWeatherCardProps) {
  return (
    <>
        {/* ── 3. Widget de Clima en Vivo de la Finca ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-sky-50/40 to-background p-4 sm:p-5 shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:via-sky-950/10 dark:to-background"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📡</span>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Estado Meteorológico en Vivo de la Finca
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Alimentado por Open-Meteo Satelital (Modelos ECMWF/NOAA)
                </p>
              </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshingWeather || !fincaId}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingWeather ? 'animate-spin' : ''}`} />
                {refreshingWeather ? 'Sincronizando...' : 'Sincronizar estación'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/campesino/weather')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                Ver estación completa →
             </button>
            </div>
            </div>
          </div>

          {currentWeather ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-card/80 rounded-xl p-3 border border-border/60">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <Thermometer className="w-3.5 h-3.5 text-red-500" />
                  <span>Temperatura</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {currentWeather.temperature_celsius?.toFixed(1) ?? '--'}°C
                </p>
                {currentWeather.feels_like_celsius != null && (
                  <p className="text-[11px] text-muted-foreground">
                    Sensación: {currentWeather.feels_like_celsius.toFixed(1)}°C
                  </p>
                )}
              </div>

              <div className="bg-card/80 rounded-xl p-3 border border-border/60">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                  <span>Precipitación</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {currentWeather.precipitation_mm?.toFixed(1) ?? '0.0'} mm
                </p>
                <p className="text-[11px] text-muted-foreground">Lluvia acumulada</p>
              </div>

              <div className="bg-card/80 rounded-xl p-3 border border-border/60">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Humedad</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {currentWeather.humidity_percent?.toFixed(0) ?? '--'}%
                </p>
                <p className="text-[11px] text-muted-foreground">Humedad relativa</p>
              </div>

              <div className="bg-card/80 rounded-xl p-3 border border-border/60">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <Wind className="w-3.5 h-3.5 text-teal-500" />
                  <span>Viento</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {currentWeather.wind_speed_kmh?.toFixed(1) ?? '--'} km/h
                </p>
                <p className="text-[11px] text-muted-foreground">Velocidad 10m</p>
              </div>

              <div className="bg-card/80 rounded-xl p-3 border border-border/60">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Índice UV</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {currentWeather.uv_index?.toFixed(0) ?? '--'}
                </p>
                <p className="text-[11px] text-muted-foreground">Radiación solar</p>
              </div>

              <div className="bg-card/80 rounded-xl p-3 border border-border/60 flex flex-col justify-center">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Condición</span>
                </div>
                <p className="text-xs font-bold text-foreground capitalize fit-clamp">
                  {currentWeather.weather_condition ?? 'Normal'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {stationAlerts.length > 0 ? `🚨 ${stationAlerts.length} alerta(s)` : '🟢 Estable'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-card/60 rounded-xl flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Configura las coordenadas GPS de la finca para ver lecturas satelitales en tiempo real.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/campesino/weather')}
                className="rounded-lg text-xs"
              >
                Abrir configuración
              </Button>
            </div>
          )}
        </motion.div>
    </>
  );
}
