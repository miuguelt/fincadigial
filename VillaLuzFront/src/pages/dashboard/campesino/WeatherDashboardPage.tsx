import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { weatherService, WeatherRecord, WeatherAlert } from '@/entities/weather';
import { useAuth } from '@/features/auth/model/useAuth';
import { Button } from '@/shared/ui/button';
import {
  RefreshCw,
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  AlertTriangle,
  Sun,
  CloudRain,
  CloudLightning,
  Snowflake,
  X,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const SEVERITY_CFG: Record<string, { label: string; color: string; bg: string; border: string; indicator: string }> = {
  low: { label: 'Baja', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-300 dark:border-green-700', indicator: 'bg-green-500' },
  medium: { label: 'Media', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700', indicator: 'bg-amber-500' },
  high: { label: 'Alta', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', indicator: 'bg-orange-500' },
  critical: { label: 'Crítica', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-400 dark:border-red-700', indicator: 'bg-red-600' },
};

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  clear: <Sun className="w-5 h-5 text-yellow-500" />,
  cloudy: <Cloud className="w-5 h-5 text-gray-500" />,
  rain: <CloudRain className="w-5 h-5 text-blue-500" />,
  storm: <CloudLightning className="w-5 h-5 text-purple-500" />,
  snow: <Snowflake className="w-5 h-5 text-cyan-400" />,
  fog: <Cloud className="w-5 h-5 text-gray-400" />,
};

function formatHour(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function getDaysLeft(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Vencida';
  if (diff === 0) return 'Vence hoy';
  return `Vence en ${diff} día${diff !== 1 ? 's' : ''}`;
}

const WeatherDashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [history, setHistory] = useState<WeatherRecord[]>([]);
  const [days, setDays] = useState(7);
  const [updating, setUpdating] = useState(false);

  const fincaId = user?.active_finca_id || user?.fincas?.[0]?.id;

  const loadData = useCallback(async () => {
    if (!fincaId) return;
    setLoading(true);
    try {
      const [dashData, histData] = await Promise.all([
        weatherService.getDashboard(fincaId, days),
        weatherService.getHistory(fincaId, days),
      ]);
      setDashboard(dashData);
      setAlerts(dashData.alerts || []);
      setHistory(histData || []);
    } catch (error: any) {
      showToast('Error cargando datos climáticos', 'error');
    } finally {
      setLoading(false);
    }
  }, [fincaId, days, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await weatherService.getCurrent(fincaId);
      showToast('Datos climáticos actualizados', 'success');
      loadData();
    } catch {
      showToast('Error actualizando datos', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDismissAlert = async (alertId: number) => {
    try {
      await weatherService.dismissAlert(fincaId, alertId);
      showToast('Alerta descartada', 'success');
      loadData();
    } catch {
      showToast('Error descartando alerta', 'error');
    }
  };

  const chartData = history.map((r) => ({
    time: formatHour(r.recorded_at),
    day: formatDay(r.recorded_at),
    temperature: r.temperature_celsius,
    humidity: r.humidity_percent,
    wind: r.wind_speed_kmh,
    precipitation: r.precipitation_mm,
  }));

  const current = dashboard?.current || history[history.length - 1];

  const renderAlertCard = (alert: WeatherAlert, index: number) => {
    const cfg = SEVERITY_CFG[alert.severity] || SEVERITY_CFG.medium;
    const daysLeft = getDaysLeft(alert.valid_until);

    return (
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`rounded-lg border-2 ${cfg.border} overflow-hidden`}
      >
        <div className={`h-1.5 ${cfg.indicator}`} />
        <div className={`${cfg.bg} p-4`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
              <AlertTriangle className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 ${cfg.color}`}>
                  Severidad {cfg.label}
                </span>
              </div>
              <h3 className={`font-bold text-base mt-1 ${cfg.color}`}>{alert.title}</h3>
              {daysLeft && (
                <p className={`text-xs mt-1 ${cfg.color} opacity-75`}>{daysLeft}</p>
              )}
            </div>
            <button
              onClick={() => handleDismissAlert(alert.id)}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {alert.recommendation && (
            <div className="mt-3 bg-white/50 dark:bg-white/5 rounded-xl p-3">
              <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>💡 Recomendación</p>
              <p className={`text-sm ${cfg.color} opacity-90`}>{alert.recommendation}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-background dark:from-blue-950/10 dark:to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🌤️ Clima y Alertas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Datos automáticos de Open-Meteo</p>
          </div>
          <Button
            onClick={handleUpdate}
            disabled={updating}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shadow-md"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Current Weather Cards */}
        {current && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-red-500" />
                <span className="text-xs text-muted-foreground">Temperatura</span>
              </div>
              <p className="text-2xl font-bold">{current.temperature_celsius?.toFixed(1) || '--'}°C</p>
              {current.feels_like_celsius && (
                <p className="text-xs text-muted-foreground">Sensación: {current.feels_like_celsius.toFixed(1)}°C</p>
              )}
            </div>

            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-muted-foreground">Humedad</span>
              </div>
              <p className="text-2xl font-bold">{current.humidity_percent?.toFixed(0) || '--'}%</p>
            </div>

            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Wind className="w-5 h-5 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Viento</span>
              </div>
              <p className="text-2xl font-bold">{current.wind_speed_kmh?.toFixed(1) || '--'} km/h</p>
            </div>

            <div className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                {WEATHER_ICONS[current.weather_condition] || <Cloud className="w-5 h-5 text-gray-500" />}
                <span className="text-xs text-muted-foreground">Condición</span>
              </div>
              <p className="text-sm font-bold capitalize">{current.weather_condition || '--'}</p>
              {current.precipitation_mm && (
                <p className="text-xs text-muted-foreground">Precip: {current.precipitation_mm.toFixed(1)}mm</p>
              )}
            </div>
          </div>
        )}

        {/* Temperature Chart */}
        {chartData.length > 0 && (
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="font-bold text-sm mb-4">📊 Histórico de Temperatura y Humedad</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="temp" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area yAxisId="temp" type="monotone" dataKey="temperature" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} name="Temp °C" />
                <Area yAxisId="humidity" type="monotone" dataKey="humidity" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.1} name="Humedad %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Wind Chart */}
        {chartData.length > 0 && (
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="font-bold text-sm mb-4"> Histórico de Viento</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="wind" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Viento km/h" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Alerts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">🚨 Alertas Activas ({alerts.length})</h2>
            <div className="flex gap-2">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    days === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-card text-muted-foreground border border-border'
                  }`}
                >
                  {d} días
                </button>
              ))}
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <span className="text-5xl">☀️</span>
              <p className="text-muted-foreground font-medium">Sin alertas activas</p>
              <p className="text-xs text-muted-foreground">El clima está favorable para las actividades</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => renderAlertCard(alert, i))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherDashboardPage;
