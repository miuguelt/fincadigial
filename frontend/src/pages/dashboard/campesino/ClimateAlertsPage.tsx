import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { campesinoServices, ClimateRiskAlert } from '@/entities/campesino';
import { weatherService, WeatherAlert, WeatherRecord } from '@/entities/weather';
import { useAuth } from '@/features/auth/model/useAuth';
import { Button } from '@/shared/ui/button';
import {
  Plus,
  X,
  Loader2,
  RefreshCw,
  Search,
  AlertTriangle,
  Clock,
  CloudSun,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Sun,
  BookOpen,
} from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { formatDateColombia } from '@/shared/utils/dateUtils';

// Configuración de severidad y estilos
const SEVERITY_CFG = {
  low:      { label: 'Baja',    emoji: '🟢', color: 'text-green-700 dark:text-green-300',  bg: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-300 dark:border-green-700',  indicator: 'bg-green-500' },
  medium:   { label: 'Media',   emoji: '🟡', color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-300 dark:border-amber-700',  indicator: 'bg-amber-500' },
  high:     { label: 'Alta',    emoji: '🟠', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', indicator: 'bg-orange-500' },
  critical: { label: 'Crítica', emoji: '🔴', color: 'text-red-700 dark:text-red-300',      bg: 'bg-red-50 dark:bg-red-950/30',      border: 'border-red-400 dark:border-red-700',       indicator: 'bg-red-600' },
} as const;

type SeverityKey = keyof typeof SEVERITY_CFG;

const RISK_TYPES = [
  { value: 'Helada', emoji: '🥶', label: 'Helada' },
  { value: 'Sequía', emoji: '☀️', label: 'Sequía' },
  { value: 'Inundación', emoji: '🌊', label: 'Inundación' },
  { value: 'Plaga', emoji: '🐛', label: 'Plaga' },
  { value: 'Viento fuerte', emoji: '💨', label: 'Viento Fuerte' },
  { value: 'Granizo', emoji: '🧊', label: 'Granizo' },
  { value: 'Deslizamiento', emoji: '⛰️', label: 'Deslizamiento' },
  { value: 'Otro', emoji: '⚠️', label: 'Otro' },
];

function getRiskEmoji(riskType?: string): string {
  if (!riskType) return '⚠️';
  const found = RISK_TYPES.find(r => riskType.toLowerCase().includes(r.value.toLowerCase()));
  return found?.emoji ?? '⚠️';
}

function getDaysLeft(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Vencida';
  if (diff === 0) return 'Vence hoy';
  return `Vence en ${diff} día${diff !== 1 ? 's' : ''}`;
}

// Guía agronómica colombiana de prevención climática
const RURAL_GUIDELINES = [
  {
    id: 'heladas',
    title: '🥶 Manejo de Heladas en Altiplanos y Páramos',
    summary: 'Riesgo entre las 2:00 am y 6:00 am con cielos despejados.',
    tips: [
      'Realizar riegos por aspersión ligeros en la madrugada para liberar calor latente.',
      'Evitar la fertilización nitrogenada alta antes de épocas críticas de heladas.',
      'Ubicar el ganado en potreros bajos protegidos por árboles o barreras vivas.',
    ],
  },
  {
    id: 'sequia',
    title: '☀️ Sequías y Veranos Prolongados',
    summary: 'Estrés hídrico en pasturas y disminución del aforo en bebederos.',
    tips: [
      'Garantizar agua fresca y limpia a voluntad (un bovino adulto requiere 40-70 L/día).',
      'Rotar a potreros con buena cobertura arbórea para mitigar estrés térmico.',
      'Suministrar sales mineralizadas con adición de forrajes conservados (ensilaje o heno).',
    ],
  },
  {
    id: 'lluvias',
    title: '🌊 Exceso de Lluvias y Encharcamientos',
    summary: 'Peligro de pododermatitis (gabarro), mastitis y pudrición radicular.',
    tips: [
      'Mantener libres y limpios los canales de drenaje y cunetas perimetrales.',
      'Pasar a los animales por pediluvios con sulfato de cobre o zinc si hay barro constante.',
      'Evitar el sobrepastoreo en lotes húmedos para prevenir la compactación del suelo.',
    ],
  },
  {
    id: 'viento',
    title: '💨 Vendavales y Vientos Fuertes',
    summary: 'Daños en cubiertas de establos y volcamiento de cultivos de porte alto.',
    tips: [
      'Revisar y asegurar amarres y anclajes en techos de galpones y establos.',
      'Sembrar cercas vivas rompevientos (ej: matarratón, botón de oro, aliso).',
      'Monitorear lotes de plátano, maíz y frutales para apuntalamiento preventivo.',
    ],
  },
];

interface FormData {
  title: string;
  risk_type: string;
  severity: string;
  description: string;
  recommendation: string;
  valid_from: string;
  valid_until: string;
  source: string;
  is_active: boolean;
}

const INITIAL_FORM: FormData = {
  title: '',
  risk_type: 'Helada',
  severity: 'medium',
  description: '',
  recommendation: '',
  valid_from: '',
  valid_until: '',
  source: 'Observación local en finca',
  is_active: true,
};

const ClimateAlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth() as any;

  const fincaId: number | undefined =
    user?.finca_id ??
    user?.active_finca_id ??
    user?.current_finca_id ??
    user?.finca?.id ??
    user?.fincas?.[0]?.id;
  const fincaName: string =
    user?.finca_name || user?.finca?.name || user?.fincas?.[0]?.name || 'tu Finca';

  // Estados de datos
  const [manualAlerts, setManualAlerts] = useState<ClimateRiskAlert[]>([]);
  const [stationAlerts, setStationAlerts] = useState<WeatherAlert[]>([]);
  const [currentWeather, setCurrentWeather] = useState<WeatherRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingWeather, setRefreshingWeather] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<'all' | 'station' | 'manual'>('all');
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  // Modal de creación / edición
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Carga general de datos
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        campesinoServices.climateRisks.getAll({ limit: 100 }),
      ];

      if (fincaId) {
        promises.push(
          weatherService.getDashboard(fincaId, 7).catch(() => null)
        );
      }

      const [risksData, weatherDashboard] = await Promise.all(promises);

      // Alertas manuales
      const list = Array.isArray(risksData) ? risksData : (risksData as any)?.data ?? [];
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      list.sort((a: any, b: any) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
      });
      setManualAlerts(list);

      // Datos de estación meteorológica
      if (weatherDashboard) {
        setStationAlerts(weatherDashboard.alerts || []);
        setCurrentWeather(weatherDashboard.current || null);
      }
    } catch {
      showToast('Error cargando alertas climáticas', 'error');
    } finally {
      setLoading(false);
    }
  }, [fincaId, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Actualizar clima en vivo
  const handleRefreshLiveWeather = async () => {
    if (!fincaId) return;
    setRefreshingWeather(true);
    try {
      const live = await weatherService.getCurrent(fincaId);
      if (live.record) setCurrentWeather(live.record);
      showToast('Datos meteorológicos actualizados', 'success');
      await loadData();
    } catch {
      showToast('Error actualizando clima de la estación', 'error');
    } finally {
      setRefreshingWeather(false);
    }
  };

  // Descartar alerta de estación
  const handleDismissStationAlert = async (alertId: number) => {
    if (!fincaId) return;
    try {
      await weatherService.dismissAlert(fincaId, alertId);
      showToast('Alerta de estación descartada', 'success');
      setStationAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch {
      showToast('Error al descartar alerta', 'error');
    }
  };

  // Modal Handlers
  const openNew = () => {
    setForm(INITIAL_FORM);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (a: ClimateRiskAlert) => {
    const al = a as any;
    setForm({
      title: al.title || '',
      risk_type: al.risk_type || 'Helada',
      severity: al.severity || 'medium',
      description: al.description || '',
      recommendation: al.recommendation || '',
      valid_from: al.valid_from?.slice(0, 16) || '',
      valid_until: al.valid_until?.slice(0, 16) || '',
      source: al.source || 'Observación local en finca',
      is_active: al.is_active ?? true,
    });
    setEditId(al.id ?? null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.risk_type) {
      showToast('Por favor ingresa el título y el tipo de riesgo', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await campesinoServices.climateRisks.update(editId, form as any);
        showToast('Alerta actualizada con éxito ✅', 'success');
      } else {
        await campesinoServices.climateRisks.create(form as any);
        showToast('Alerta de riesgo registrada con éxito ✅', 'success');
      }
      setShowForm(false);
      loadData();
    } catch {
      showToast('Error guardando la alerta', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta alerta registrada?')) return;
    try {
      await campesinoServices.climateRisks.delete(id);
      showToast('Alerta eliminada correctamente', 'success');
      loadData();
    } catch {
      showToast('Error al eliminar la alerta', 'error');
    }
  };

  // Filtrado unificado
  const filteredManual = useMemo(() => {
    const term = search.toLowerCase();
    return manualAlerts.filter(a => {
      const al = a as any;
      const matchSearch =
        !term ||
        (al.title || '').toLowerCase().includes(term) ||
        (al.risk_type || '').toLowerCase().includes(term) ||
        (al.description || '').toLowerCase().includes(term);
      const matchSev = filterSeverity === 'all' || al.severity === filterSeverity;
      return matchSearch && matchSev;
    });
  }, [manualAlerts, search, filterSeverity]);

  const filteredStation = useMemo(() => {
    const term = search.toLowerCase();
    return stationAlerts.filter(a => {
      const matchSearch =
        !term ||
        (a.title || '').toLowerCase().includes(term) ||
        (a.alert_type || '').toLowerCase().includes(term) ||
        (a.description || '').toLowerCase().includes(term);
      const matchSev = filterSeverity === 'all' || a.severity === filterSeverity;
      return matchSearch && matchSev;
    });
  }, [stationAlerts, search, filterSeverity]);

  const totalActiveCount =
    manualAlerts.filter(a => (a as any).is_active).length + stationAlerts.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-background to-background dark:from-orange-950/10 dark:via-background dark:to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6 md:space-y-8">

        {/* ── 1. Barra de Navegación Rápida Superior ────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border/50">
          <button
            type="button"
            onClick={() => navigate('/campesino')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Mi Panel Campesino
          </button>

          {/* Enlace destacado hacia la Estación Meteorológica */}
          <Button
            onClick={() => navigate('/campesino/weather')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 text-xs sm:text-sm shadow-md shadow-blue-500/20"
          >
            <CloudSun className="w-4 h-4" />
            Ver Estación Meteorológica y Pronóstico
            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
          </Button>
        </div>

        {/* ── 2. Encabezado Principal ────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                ⛈️ Alertas Climáticas y Prevención
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                {totalActiveCount} alerta{totalActiveCount !== 1 ? 's' : ''} activa{totalActiveCount !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Monitoreo preventivo de heladas, sequías, vendavales e inundaciones para <span className="font-semibold text-foreground">{fincaName}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl gap-1.5 text-xs sm:text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              onClick={openNew}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-1.5 shadow-md shadow-orange-500/20 text-xs sm:text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nueva Alerta Local
            </Button>
          </div>
        </div>

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
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshLiveWeather}
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

        {/* ── 4. Filtros y Búsqueda de Alertas ───────────────────────────────── */}
        <div className="space-y-3">
          {/* Pestañas de origen de alerta */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border/40">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🚨 Todas las Alertas
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-muted">
                {manualAlerts.length + stationAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('station')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'station'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🌤️ Estación Automática (Open-Meteo)
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {stationAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'manual'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🌾 Alertas Locales y Agrícolas
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                {manualAlerts.length}
              </span>
            </button>
          </div>

          {/* Búsqueda y severidad */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por helada, sequía, plaga, recomendación..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                  filterSeverity === 'all'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-card text-muted-foreground border-border'
                }`}
              >
                Todas las severidades
              </button>
              {Object.entries(SEVERITY_CFG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFilterSeverity(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1 ${
                    filterSeverity === key
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 5. Listado de Alertas Unificadas ───────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Alertas de la Estación Automática (Open-Meteo) */}
            {(activeTab === 'all' || activeTab === 'station') && filteredStation.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    🌤️ Alertas de la Estación Meteorológica ({filteredStation.length})
                  </h3>
                  <button
                    onClick={() => navigate('/campesino/weather')}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Ver detalles del pronóstico →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredStation.map((alert) => {
                    const cfg = SEVERITY_CFG[alert.severity as SeverityKey] ?? SEVERITY_CFG.medium;
                    const daysLeft = getDaysLeft(alert.valid_until);

                    return (
                      <motion.div
                        key={`station-${alert.id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-xl border-2 ${cfg.border} overflow-hidden shadow-sm flex flex-col justify-between`}
                      >
                        <div className={`h-1.5 ${cfg.indicator}`} />
                        <div className={`${cfg.bg} p-4 flex-1 flex flex-col justify-between`}>
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${cfg.color}`}>
                                  {cfg.emoji} Severidad {cfg.label}
                                </span>
                                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                  📡 Automática Open-Meteo
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDismissStationAlert(alert.id)}
                                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                                title="Descartar alerta"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <h4 className={`font-bold text-base ${cfg.color}`}>
                              {alert.title}
                            </h4>
                            <p className="text-xs text-foreground/80 mt-1">
                              {alert.description}
                            </p>

                            {alert.recommendation && (
                              <div className="mt-3 bg-white/60 dark:bg-white/5 rounded-xl p-3 border border-border/40">
                                <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>
                                  💡 Recomendación de manejo ganadero/agrícola:
                                </p>
                                <p className="text-xs font-medium text-foreground/90">
                                  {alert.recommendation}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                            {daysLeft && (
                              <span className="flex items-center gap-1 font-semibold text-foreground/80">
                                <Clock className="w-3 h-3 text-orange-500" /> {daysLeft}
                              </span>
                            )}
                            <span>Fuente: {alert.source || 'Estación satelital'}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Alertas Locales y Agrícolas Registradas */}
            {(activeTab === 'all' || activeTab === 'manual') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                    🌾 Alertas Locales Registradas en Campo ({filteredManual.length})
                  </h3>
                  <Button
                    onClick={openNew}
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva
                  </Button>
                </div>

                {filteredManual.length === 0 ? (
                  <div className="text-center py-10 bg-card/40 rounded-2xl border border-dashed border-border/80 space-y-2">
                    <span className="text-3xl">⛅</span>
                    <p className="text-sm font-semibold text-muted-foreground">
                      No hay alertas locales registradas para este filtro
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Puedes reportar heladas, daños por granizo, plagas o crecientes observadas en tus potreros.
                    </p>
                    <Button onClick={openNew} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl mt-2">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Alerta Local
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredManual.map((alert, i) => {
                      const a = alert as any;
                      const cfg = SEVERITY_CFG[a.severity as SeverityKey] ?? SEVERITY_CFG.medium;
                      const emoji = getRiskEmoji(a.risk_type);
                      const daysLeft = getDaysLeft(a.valid_until);
                      const isExpanded = expandedId === a.id;

                      return (
                        <motion.div
                          key={`manual-${a.id || i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-xl border-2 ${cfg.border} overflow-hidden shadow-sm ${!a.is_active ? 'opacity-60' : ''}`}
                        >
                          <div className={`h-1.5 ${cfg.indicator}`} />
                          <div className={`${cfg.bg} p-4`}>
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-xl bg-white/70 dark:bg-white/10 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                                {emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${cfg.color}`}>
                                        {cfg.emoji} Severidad {cfg.label}
                                      </span>
                                      {!a.is_active && (
                                        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                          Inactiva
                                        </span>
                                      )}
                                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                        Observación de Finca
                                      </span>
                                    </div>
                                    <h4 className={`font-bold text-base mt-1 ${cfg.color}`}>
                                      {a.title}
                                    </h4>
                                    <p className={`text-xs font-semibold opacity-75 ${cfg.color}`}>
                                      {a.risk_type}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                                      className={`p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/10 transition-colors ${cfg.color}`}
                                      title="Ver detalles y recomendaciones"
                                    >
                                      <AlertTriangle className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEdit(alert)}
                                      className={`p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-white/10 transition-colors ${cfg.color}`}
                                      title="Editar alerta"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(a.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-all"
                                      title="Eliminar alerta"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {daysLeft && (
                                  <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${daysLeft === 'Vencida' ? 'text-muted-foreground' : cfg.color}`}>
                                    <Clock className="w-3.5 h-3.5" /> {daysLeft}
                                    {a.valid_until && (
                                      <span className="opacity-60 font-normal">· hasta {formatDateColombia(a.valid_until)}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Detalles y Recomendación */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className={`mt-3 pt-3 border-t ${cfg.border} space-y-2`}>
                                    {a.description && (
                                      <div>
                                        <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>📝 Descripción:</p>
                                        <p className="text-xs text-foreground/80">{a.description}</p>
                                      </div>
                                    )}
                                    {a.recommendation && (
                                      <div className="bg-white/60 dark:bg-white/5 rounded-xl p-3 border border-border/40">
                                        <p className={`text-xs font-bold ${cfg.color} mb-0.5`}>💡 ¿Qué debe hacer el campesino?</p>
                                        <p className="text-xs font-medium text-foreground/90">{a.recommendation}</p>
                                      </div>
                                    )}
                                    {a.source && (
                                      <p className="text-[11px] text-muted-foreground">Fuente: {a.source}</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 6. Guía Agronómica Colombiana de Prevención Climática ───────────── */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground">
                Guía Rural: Medidas de Prevención y Protección Ganadera/Agrícola
              </h3>
              <p className="text-xs text-muted-foreground">
                Recomendaciones expertas adaptadas a las condiciones climáticas del campo colombiano
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RURAL_GUIDELINES.map((guide) => {
              const isOpen = expandedGuide === guide.id;
              return (
                <div
                  key={guide.id}
                  className="border border-border/60 rounded-xl p-3.5 bg-background/60 hover:bg-background transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedGuide(isOpen ? null : guide.id)}
                    className="w-full flex items-center justify-between text-left gap-2 font-bold text-xs sm:text-sm text-foreground"
                  >
                    <span>{guide.title}</span>
                    <span className="text-xs text-muted-foreground">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">{guide.summary}</p>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ul className="mt-2.5 pt-2 border-t border-border/40 space-y-1.5 text-xs text-foreground/90 list-disc list-inside">
                          {guide.tips.map((tip, idx) => (
                            <li key={idx} className="leading-relaxed">{tip}</li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Modal de Creación / Edición de Alerta Local ──────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="vl-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="vl-modal-surface w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  {editId ? '✏️ Editar Alerta de Riesgo' : '⛈️ Registrar Nueva Alerta de Riesgo'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Título de la Alerta *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Helada prevista en potrero La Esperanza"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Tipo de Riesgo *
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {RISK_TYPES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, risk_type: r.value }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                          form.risk_type === r.value
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span className="text-xl">{r.emoji}</span>
                        <span className="fit-clamp">{r.label}</span>
                      </button>
                    ))}
                  </div>
                  {form.risk_type === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Especifique el tipo de riesgo..."
                      value={form.risk_type === 'Otro' ? '' : form.risk_type}
                      onChange={e => setForm(f => ({ ...f, risk_type: e.target.value }))}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Nivel de Severidad *
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(SEVERITY_CFG).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, severity: key }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                          form.severity === key
                            ? `${cfg.border} ${cfg.bg} ${cfg.color}`
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span className="text-xl">{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Descripción del Fenómeno
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre lo observado o previsto (temperatura estimada, potreros afectados)..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    💡 ¿Qué debe hacer el campesino / operario?
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Encender aspersores a las 4 am, mover terneros al establo o vigilar drenajes..."
                    value={form.recommendation}
                    onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      📅 Válida Desde
                    </label>
                    <input
                      type="datetime-local"
                      value={form.valid_from}
                      onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      📅 Válida Hasta
                    </label>
                    <input
                      type="datetime-local"
                      value={form.valid_until}
                      onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Fuente de la Información
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Observación directa, IDEAM, Asociación de Ganaderos"
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                    form.is_active
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <span className="font-semibold text-sm">¿Alerta activa actualmente?</span>
                  <span className="text-xl">{form.is_active ? '✅ Activa' : '❌ Inactiva'}</span>
                </button>
              </div>

              <div className="px-5 pb-5">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 text-base font-bold shadow-md shadow-orange-500/20"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando alerta...
                    </>
                  ) : (
                    '✅ Guardar y Publicar Alerta'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClimateAlertsPage;
