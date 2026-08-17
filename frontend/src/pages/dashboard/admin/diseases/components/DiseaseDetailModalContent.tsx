import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  HeartPulse,
  Syringe,
  Calendar,
  Users,
  ShieldCheck,
  ShieldAlert,
  Info,
  Stethoscope,
  Search
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import type { DiseaseResponse, AnimalDiseaseResponse, VaccineResponse } from '@/shared/api/generated/swaggerTypes';
import { AnimalLink } from '@/entities/animal/ui';
import { UserLink } from '@/entities/user/ui';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';

interface DiseaseDetailModalContentProps {
  disease: DiseaseResponse & { [key: string]: any };
  onNavigateToItem?: (item: any) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Activo: '#ef4444',
  'En tratamiento': '#f59e0b',
  'En Tratamiento': '#f59e0b',
  Observación: '#3b82f6',
  Recuperado: '#10b981',
  Tratado: '#10b981',
  Crónico: '#8b5cf6',
  Default: '#64748b'
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function DiseaseDetailModalContent({ disease }: DiseaseDetailModalContentProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'animals' | 'prevention'>('stats');
  const [records, setRecords] = useState<AnimalDiseaseResponse[]>([]);
  const [vaccines, setVaccines] = useState<VaccineResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const diseaseId = disease.id;
  const diseaseName = (disease as any).name || (disease as any).disease || 'Enfermedad';
  const diseaseSymptoms = disease.symptoms || (disease as any).description || 'No especificados';
  const diseaseDetails = (disease as any).details || (disease as any).description || '';

  // Cargar registros de animales y vacunas asociadas
  const loadData = useCallback(async () => {
    if (!diseaseId) return;
    setLoading(true);
    try {
      const [animalDiseasesResp, vaccinesResp] = await Promise.all([
        animalDiseasesService.getAnimalDiseases({
          disease_id: diseaseId,
          limit: 1000,
          page: 1
        }).catch(() => ({ data: [] })),
        vaccinesService.getPaginated({
          target_disease_id: diseaseId,
          limit: 100,
          page: 1
        }).catch(() => ({ data: [] }))
      ]);

      const animalData = (animalDiseasesResp as any)?.data || (animalDiseasesResp as any)?.items || [];
      const vaccineData = (vaccinesResp as any)?.data || (vaccinesResp as any)?.items || [];

      setRecords(Array.isArray(animalData) ? animalData : []);
      setVaccines(Array.isArray(vaccineData) ? vaccineData : []);
    } catch (err) {
      console.error('[DiseaseDetailModalContent] Error cargando datos de enfermedad:', err);
    } finally {
      setLoading(false);
    }
  }, [diseaseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos epidemiológicos y KPIs deterministas
  const analytics = useMemo(() => {
    const total = records.length;
    const uniqueAnimals = new Set(records.map(r => r.animal_id)).size;

    let active = 0;
    let inTreatment = 0;
    let recovered = 0;
    let critical = 0;
    let observation = 0;

    const statusCounts: Record<string, number> = {};
    const monthlyGroups: Record<string, number> = {};

    records.forEach(r => {
      const status = r.status || 'Activo';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (status === 'Activo') {
        active++;
      } else if (status === 'En tratamiento' || status === 'En Tratamiento') {
        inTreatment++;
      } else if (status === 'Observación') {
        observation++;
      } else if (status === 'Recuperado' || status === 'Tratado') {
        recovered++;
      } else if (status === 'Crónico') {
        critical++;
      }

      // Agrupación mensual
      if (r.diagnosis_date) {
        try {
          const date = new Date(r.diagnosis_date);
          if (!isNaN(date.getTime())) {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyGroups[key] = (monthlyGroups[key] || 0) + 1;
          }
        } catch {
          // Ignorar error de parseo
        }
      }
    });

    const activeTotal = active + inTreatment + observation;
    const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0;
    const activeRate = total > 0 ? Math.round((activeTotal / total) * 100) : 0;

    // Clasificación de severidad epidemiológica
    let severityLevel: 'controlado' | 'vigilancia' | 'alerta' = 'controlado';
    if (activeTotal >= 3 || (total > 5 && activeRate > 35)) {
      severityLevel = 'alerta';
    } else if (activeTotal > 0) {
      severityLevel = 'vigilancia';
    }

    // Datos ordenados para gráfico temporal
    const sortedTimeline = Object.entries(monthlyGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Últimos 12 periodos
      .map(([key, count]) => {
        const [yearStr, monthStr] = key.split('-');
        const mIdx = parseInt(monthStr, 10) - 1;
        return {
          period: key,
          label: `${MONTH_NAMES[mIdx] || monthStr} ${yearStr?.slice(2) || ''}`,
          casos: count
        };
      });

    // Distribución por estado para Donut Chart
    const pieData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name] || STATUS_COLORS.Default
    }));

    return {
      total,
      uniqueAnimals,
      activeTotal,
      active,
      inTreatment,
      observation,
      recovered,
      critical,
      recoveryRate,
      activeRate,
      severityLevel,
      timelineData: sortedTimeline,
      pieData
    };
  }, [records]);

  // Filtrado de reses diagnosticadas
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Filtro por estado
      if (statusFilter !== 'todos') {
        if (statusFilter === 'activos') {
          const isAct = r.status === 'Activo' || r.status === 'En tratamiento' || r.status === 'En Tratamiento' || r.status === 'Observación';
          if (!isAct) return false;
        } else if (statusFilter === 'recuperados') {
          if (r.status !== 'Recuperado' && r.status !== 'Tratado') return false;
        } else if (statusFilter === 'criticos') {
          if (r.status !== 'Crónico') return false;
        }
      }

      // Filtro por búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const animalRecord = String((r as any)?.animal?.record || r.animal_id || '').toLowerCase();
        const instructor = String((r as any)?.instructor?.fullname || '').toLowerCase();
        const notes = String(r.notes || '').toLowerCase();
        return animalRecord.includes(term) || instructor.includes(term) || notes.includes(term);
      }

      return true;
    });
  }, [records, statusFilter, searchTerm]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ========================================================
          HEADER HERO CON ESTADO SANITARIO Y RESUMEN RÁPIDO
          ======================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 via-card/50 to-muted/20 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-500/20 shadow-inner">
              <HeartPulse className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-foreground">
                  {diseaseName}
                </h3>
                <Badge variant="outline" className="text-xs font-mono font-semibold bg-muted/30">
                  ID #{diseaseId}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-xl">
                <span className="font-semibold text-foreground/80">Síntomas clave: </span>
                {diseaseSymptoms}
              </p>
            </div>
          </div>

          {/* Badge Epidemiológico de Brote */}
          <div className="flex flex-wrap items-center gap-2">
            {analytics.severityLevel === 'controlado' && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Brote Controlado (0 Activos)</span>
              </div>
            )}
            {analytics.severityLevel === 'vigilancia' && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                <ShieldAlert className="h-4 w-4 text-amber-500 animate-bounce" />
                <span>Vigilancia Sanitaria ({analytics.activeTotal} activos)</span>
              </div>
            )}
            {analytics.severityLevel === 'alerta' && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-sm animate-pulse">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>Alerta Sanitaria / Brote ({analytics.activeTotal} activos)</span>
              </div>
            )}

            {vaccines.length > 0 ? (
              <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 text-xs py-1.5">
                <Syringe className="h-3.5 w-3.5 mr-1" />
                {vaccines.length} {vaccines.length === 1 ? 'Vacuna disponible' : 'Vacunas disponibles'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs py-1.5 opacity-70">
                Sin vacunas registradas
              </Badge>
            )}
          </div>
        </div>

        {/* Barra de Pestañas de Navegación del Modal */}
        <div className="mt-5 pt-4 border-t border-border/30 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'stats'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Estadísticas & KPIs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('animals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'animals'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Reses Diagnosticadas</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'animals' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted/60 text-muted-foreground'
            }`}>
              {analytics.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prevention')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'prevention'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Syringe className="h-4 w-4" />
            <span>Manejo & Vacunación</span>
            {vaccines.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'prevention' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted/60 text-muted-foreground'
              }`}>
                {vaccines.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          PESTAÑA 1: ESTADÍSTICAS, KPIS Y GRÁFICOS INTERACTIVOS
          ======================================================== */}
      {activeTab === 'stats' && (
        <div className="space-y-5 animate-in fade-in-50 duration-300">
          {/* Bento Grid de KPIs Epidemiológicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Total Casos */}
            <div className="rounded-xl border border-border/40 bg-card/40 p-4 shadow-sm backdrop-blur-md hover:border-border/80 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                  Total Casos
                </span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {analytics.total}
                </span>
                <span className="text-xs text-muted-foreground">diagnósticos</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground/80 font-medium">
                {analytics.uniqueAnimals} {analytics.uniqueAnimals === 1 ? 'res única afectada' : 'reses únicas afectadas'}
              </p>
            </div>

            {/* KPI 2: Casos Activos */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 shadow-sm backdrop-blur-md hover:border-red-500/40 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-red-600/80 dark:text-red-400/80 uppercase tracking-wider">
                  Casos Activos
                </span>
                <div className="p-2 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                  <HeartPulse className="h-4 w-4 animate-pulse" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-red-600 dark:text-red-400">
                  {analytics.activeTotal}
                </span>
                <span className="text-xs text-muted-foreground">enfermos</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground/80 font-medium">
                {analytics.inTreatment} en tratamiento, {analytics.active} activos
              </p>
            </div>

            {/* KPI 3: Tasa de Recuperación */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-md hover:border-emerald-500/40 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">
                  Sanados / De Alta
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {analytics.recoveryRate}%
                </span>
                <span className="text-xs text-muted-foreground">({analytics.recovered} reses)</span>
              </div>
              <div className="mt-2">
                <Progress
                  value={analytics.recoveryRate}
                  className="h-1.5 bg-emerald-500/10"
                  indicatorClassName="bg-emerald-500"
                />
              </div>
            </div>

            {/* KPI 4: Casos Crónicos / Graves */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm backdrop-blur-md hover:border-amber-500/40 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider">
                  Casos Crónicos
                </span>
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                  {analytics.critical}
                </span>
                <span className="text-xs text-muted-foreground">crónicos</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground/80 font-medium">
                {analytics.critical > 0 ? 'Requiere seguimiento intensivo' : 'Sin casos graves reportados'}
              </p>
            </div>
          </div>

          {/* Gráficos de Evolución y Distribución */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfico 1: Evolución Temporal de Diagnósticos */}
            <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-black tracking-tight text-foreground uppercase">
                    Evolución Mensual de Diagnósticos
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Últimos periodos registrados
                </span>
              </div>

              {analytics.timelineData.length > 0 ? (
                <div className="h-[230px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics.timelineData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="diseaseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(150,150,150,0.2)' }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'rgba(23, 23, 23, 0.92)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
                        }}
                        formatter={(value: any) => [`${value} casos`, 'Diagnosticados']}
                        labelFormatter={(label) => `Periodo: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="casos"
                        name="Casos"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#diseaseAreaGrad)"
                        dot={{ r: 4, fill: '#ef4444', strokeWidth: 1.5, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[230px] border border-dashed rounded-xl border-border/50 text-center p-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    Aún no hay suficiente historial temporal registrado para esta enfermedad.
                  </p>
                </div>
              )}
            </div>

            {/* Gráfico 2: Distribución de Estado Clínico */}
            <div className="rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-black tracking-tight text-foreground uppercase">
                    Estado de Salud
                  </h4>
                </div>

                {analytics.total > 0 ? (
                  <div className="h-[150px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.pieData}
                          innerRadius={42}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {analytics.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgba(23, 23, 23, 0.92)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '11px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-extrabold">{analytics.total}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Total</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[150px] border border-dashed rounded-xl border-border/50 text-center p-2">
                    <Info className="h-6 w-6 text-muted-foreground/40 mb-1" />
                    <p className="text-[11px] text-muted-foreground">Sin datos de estado</p>
                  </div>
                )}
              </div>

              {/* Leyenda de Estados */}
              <div className="mt-3 space-y-1.5 text-xs">
                {analytics.pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recomendación Veterinaria Determinista y Protocolo Sugerido */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-black uppercase tracking-wider text-primary">
                  Directriz Zootécnica y Sanitaria para la Finca
                </h5>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {analytics.activeTotal === 0
                    ? `El hato se encuentra actualmente libre de casos activos de ${diseaseName}. Se recomienda continuar con los protocolos periódicos de desinfección en comederos y mantener la vigilancia en potreros de rotación.`
                    : `Hay ${analytics.activeTotal} ${analytics.activeTotal === 1 ? 'res en estado activo u observación' : 'reses en estado activo u observación'}. Es indispensable mantener los animales en el potrero de enfermería / cuarentena, verificar la adherencia al plan de tratamientos y registrar su evolución médica periódicamente.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 2: RESES DIAGNOSTICADAS (TABLA/LISTA INTERACTIVA)
          ======================================================== */}
      {activeTab === 'animals' && (
        <div className="space-y-4 animate-in fade-in-50 duration-300">
          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/30">
            {/* Botones de Filtro Rápido */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'todos', label: 'Todos', count: records.length },
                { id: 'activos', label: 'Activos', count: analytics.activeTotal },
                { id: 'recuperados', label: 'Sanados', count: analytics.recovered },
                { id: 'criticos', label: 'Crónicos', count: analytics.critical }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === f.id
                      ? 'bg-card text-foreground shadow-sm border border-border/60'
                      : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Caja de Búsqueda */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por chapa o notas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs bg-background/80 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Listado de Animales */}
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Cargando historial de reses...
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="border border-border/40 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-black tracking-wider sticky top-0 backdrop-blur-md border-b border-border/40">
                    <tr>
                      <th className="px-4 py-3">Res (Código)</th>
                      <th className="px-4 py-3">Fecha Detección</th>
                      <th className="px-4 py-3">Estado Clínico</th>
                      <th className="px-4 py-3">Encargado</th>
                      <th className="px-4 py-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 bg-card/20">
                    {filteredRecords.map((rec) => {
                      const status = rec.status || 'Activo';
                      const statusColor = STATUS_COLORS[status] || STATUS_COLORS.Default;

                      return (
                        <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <AnimalLink
                              id={rec.animal_id}
                              label={(rec as any)?.animal?.record || `Res #${rec.animal_id}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {rec.diagnosis_date
                              ? new Date(rec.diagnosis_date).toLocaleDateString('es-CO', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                              style={{
                                color: statusColor,
                                backgroundColor: `${statusColor}15`,
                                borderColor: `${statusColor}30`
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: statusColor }}
                              />
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rec.instructor_id ? (
                              <UserLink
                                id={rec.instructor_id}
                                label={(rec as any)?.instructor?.fullname || `Usuario #${rec.instructor_id}`}
                                role="Encargado"
                              />
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={rec.notes || ''}>
                            {rec.notes || <span className="italic opacity-60">Sin notas adicionales</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed rounded-xl border-border/40 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-bold text-foreground">No se encontraron reses registradas</p>
              <p className="text-[11px] text-muted-foreground">
                {searchTerm || statusFilter !== 'todos'
                  ? 'No hay registros que coincidan con los filtros aplicados.'
                  : 'Ningún animal ha sido diagnosticado con esta enfermedad hasta la fecha.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PESTAÑA 3: MANEJO, SÍNTOMAS Y VACUNAS PREVENTIVAS
          ======================================================== */}
      {activeTab === 'prevention' && (
        <div className="space-y-4 animate-in fade-in-50 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta de Síntomas y Cuadro Clínico */}
            <div className="rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                  <Activity className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-black tracking-tight text-foreground uppercase">
                  Cuadro Clínico y Sintomatología
                </h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    Signos Clínicos Notificados:
                  </span>
                  <p className="text-foreground font-medium leading-relaxed">
                    {diseaseSymptoms}
                  </p>
                </div>

                {diseaseDetails && (
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      Descripción y Manejo:
                    </span>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {diseaseDetails}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tarjeta de Vacunas Preventivas en la Finca */}
            <div className="rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600">
                    <Syringe className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-black tracking-tight text-foreground uppercase">
                    Vacunas Preventivas Registradas
                  </h4>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {vaccines.length} asociadas
                </Badge>
              </div>

              {vaccines.length > 0 ? (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {vaccines.map((v) => (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Syringe className="h-3.5 w-3.5 text-cyan-600" />
                          {v.name}
                        </span>
                        <Badge className="bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-[10px]">
                          {v.type || 'Vacuna'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                        <div>
                          <span className="font-semibold text-foreground/80">Dosis: </span>
                          {v.dosis || '-'}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground/80">Refuerzo: </span>
                          {(v as any).vaccination_interval ? `${(v as any).vaccination_interval} días` : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center border border-dashed rounded-xl border-border/50 space-y-2">
                  <Syringe className="h-7 w-7 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    No hay vacunas preventivas asignadas a esta enfermedad en el inventario.
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Puedes vincular vacunas seleccionando esta patología como objetivo en el catálogo de Vacunas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Medidas de Bioseguridad y Buenas Prácticas Ganaderas */}
          <div className="rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-md shadow-sm space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-black tracking-tight text-foreground uppercase">
                Protocolo de Bioseguridad Ganadera Recomendado
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-muted/10 border border-border/30 space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Aislamiento y Cuarentena
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Separar reses con síntomas en el corral de enfermería para frenar la transmisión horizontal.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/10 border border-border/30 space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Desinfección de Áreas
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sanitizar comederos, bebederos y herramientas de manejo tras el contacto con animales enfermos.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/10 border border-border/30 space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Control de Lote y Potrero
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Restringir el pastoreo en potreros afectados hasta completar el periodo de carencia o desinfección.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiseaseDetailModalContent;
