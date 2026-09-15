import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { campesinoServices, ClimateRiskAlert } from '@/entities/campesino';
import { weatherService, WeatherAlert, WeatherRecord } from '@/entities/weather';
import { useAuth } from '@/features/auth/model/useAuth';
import { Button } from '@/shared/ui/button';
import { Plus, RefreshCw, CloudSun, ArrowLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { CampesinoViewShell } from '@/widgets/layout/CampesinoViewShell';
import { ClimateAlertFilters } from './ClimateAlertFilters';
import { ClimateAlertForm } from './ClimateAlertForm';
import { ClimateAlertList } from './ClimateAlertList';
import { ClimateGuidelines } from './ClimateGuidelines';
import { ClimateLiveWeatherCard } from './ClimateLiveWeatherCard';

const SEVERITY_CFG = {
  low:      { label: 'Baja',    emoji: '🟢', color: 'text-green-700 dark:text-green-300',  bg: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-300 dark:border-green-700',  indicator: 'bg-green-500' },
  medium:   { label: 'Media',   emoji: '🟡', color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-300 dark:border-amber-700',  indicator: 'bg-amber-500' },
  high:     { label: 'Alta',    emoji: '🟠', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', indicator: 'bg-orange-500' },
  critical: { label: 'Crítica', emoji: '🔴', color: 'text-red-700 dark:text-red-300',      bg: 'bg-red-50 dark:bg-red-950/30',      border: 'border-red-400 dark:border-red-700',       indicator: 'bg-red-600' },
} as const;

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

  const [manualAlerts, setManualAlerts] = useState<ClimateRiskAlert[]>([]);
  const [stationAlerts, setStationAlerts] = useState<WeatherAlert[]>([]);
  const [currentWeather, setCurrentWeather] = useState<WeatherRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingWeather, setRefreshingWeather] = useState(false);

  const [activeTab, setActiveTab] = useState<'all' | 'station' | 'manual'>('all');
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

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

  return (
    <CampesinoViewShell
      title="Alertas climáticas y prevención"
      description={<>Monitoreo preventivo de heladas, sequías, vendavales e inundaciones para <span className="font-semibold text-foreground">{fincaName}</span>.</>}
      icon={<CloudSun className="h-5 w-5 text-white" aria-hidden="true" />}
      leading={(
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={() => navigate('/campesino')} aria-label="Volver a mi panel">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      actions={(
        <>
          <Button onClick={() => navigate('/campesino/weather')} variant="outline" className="h-11 w-full gap-2 rounded-xl text-xs sm:w-auto sm:text-sm">
            <CloudSun className="h-4 w-4" />
            Ver estación meteorológica
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          </Button>
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="h-11 w-full gap-1.5 rounded-xl text-xs sm:w-auto sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              onClick={openNew}
              className="h-11 w-full gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md hover:bg-primary/90 sm:w-auto sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva alerta
            </Button>
        </>
      )}
    >

        <ClimateLiveWeatherCard
          currentWeather={currentWeather}
          stationAlerts={stationAlerts}
          fincaId={fincaId}
          refreshingWeather={refreshingWeather}
          onRefresh={handleRefreshLiveWeather}
          navigate={navigate}
        />

        <ClimateAlertFilters
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          search={search}
          setSearch={setSearch}
          filterSeverity={filterSeverity}
          setFilterSeverity={setFilterSeverity}
          severityConfig={SEVERITY_CFG}
          manualAlertCount={manualAlerts.length}
          stationAlertCount={stationAlerts.length}
        />

        <ClimateAlertList
          loading={loading}
          activeTab={activeTab}
          filteredStation={filteredStation}
          filteredManual={filteredManual}
          severityConfig={SEVERITY_CFG}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          navigate={navigate}
          handleDismissStationAlert={handleDismissStationAlert}
          openNew={openNew}
          openEdit={openEdit}
          handleDelete={handleDelete}
          getRiskEmoji={getRiskEmoji}
          getDaysLeft={getDaysLeft}
        />

        <ClimateGuidelines
          expandedGuide={expandedGuide}
          setExpandedGuide={setExpandedGuide}
          ruralGuidelines={RURAL_GUIDELINES}
        />

        <ClimateAlertForm
          showForm={showForm}
          setShowForm={setShowForm}
          editId={editId}
          form={form}
          setForm={setForm}
          saving={saving}
          riskTypes={RISK_TYPES}
          severityConfig={SEVERITY_CFG}
          handleSave={handleSave}
        />
    </CampesinoViewShell>
  );
};

export default ClimateAlertsPage;
