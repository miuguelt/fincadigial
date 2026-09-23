import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { ArrowLeft, Award, Star, Activity, AlertTriangle } from 'lucide-react';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { motion } from 'framer-motion';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';

interface SireData {
  sire_id: number;
  record: string;
  breed: string;
  inseminations: number;
  positive_diagnoses: number;
  conception_rate_pct: number;
  total_offspring: number;
  avg_birth_weight_kg: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

interface SirePerformanceData {
  period_months: number;
  sires: SireData[];
}

interface SirePerformanceProps {
  isEmbedded?: boolean;
}

export default function SirePerformance({ isEmbedded = false }: SirePerformanceProps) {
  const { goTo } = useRoleNavigation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<SirePerformanceData | null>(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  const loadSirePerformance = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reproductionService.getSirePerformance(months);
      setData(response as SirePerformanceData);
    } catch (error) {
      console.error('Error loading sire performance:', error);
      showToast('Error al cargar desempeño de toros', 'error');
    } finally {
      setLoading(false);
    }
  }, [months, showToast]);

  useEffect(() => {
    loadSirePerformance();
  }, [loadSirePerformance]);

  const gradeStatusMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
    'A': 'success',
    'B': 'info',
    'C': 'warning',
    'D': 'danger',
  };

  const getGradeBadgeClass = (grade: string) =>
    getStatusBadgeClass(gradeStatusMap[grade] || 'neutral');

  const chartData = data?.sires.slice(0, 10).map(sire => ({
    name: sire.record,
    rate: sire.conception_rate_pct,
  })) || [];

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground animate-pulse">
        <Activity className="h-10 w-10 text-primary animate-spin" />
        <p className="font-semibold text-sm">Cargando desempeño reproductivo de toros...</p>
      </div>
    );
  }

  if (!data || data.sires.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay datos de desempeño de toros disponibles</p>
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "space-y-6" : "min-h-full bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden"}>
      {!isEmbedded ? (
        <DataScreenHeader
          leading={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goTo('/admin/reproduction')}
              className="h-9 w-9 rounded-full border border-border/60 hover:bg-muted/50 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          }
          icon={<Award className="h-5 w-5 text-white" />}
          iconClassName="from-indigo-500 to-violet-600 shadow-indigo-500/20"
          title={<>Análisis de <span className="text-indigo-600">Toros y Reproductores</span></>}
          description="Desempeño reproductivo y efectividad de preñez de los machos de la finca"
          actions={
            <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-lg bg-background/50 border-border/50 font-semibold focus:ring-indigo-500/20">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border">
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="24">Últimos 24 meses</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600" />
              Evaluación Reproductiva de Toros y Reproductores
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tasa de preñez por servicio, crías nacidas y pesos promedio al nacer
            </p>
          </div>
          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-lg font-semibold">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Gráfico de barras */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-2xl overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Tasa de Preñez por Reproductor
            </CardTitle>
            <CardDescription>Eficiencia comparativa de los principales 10 toros</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <YAxis style={{ fontSize: '10px' }} tickFormatter={(tick) => `${tick}%`} />
                  <ChartTooltip formatter={(value: any) => [`${value}%`, 'Tasa de Preñez']} />
                  <Legend />
                  <Bar dataKey="rate" fill="#6366F1" radius={[4, 4, 0, 0]} name="Tasa de Preñez (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lista de toros: Vista Híbrida Móvil (Cards) y Escritorio (Tabla) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 sm:p-6 border-b border-border/30">
            <CardTitle className="text-lg sm:text-xl font-black text-foreground">Ranking y Ficha de Reproductores</CardTitle>
            <CardDescription className="text-xs font-medium mt-0.5">
              Evaluación por tasa de preñez, crías logradas y pesos al nacer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* VISTA MÓVIL (<md): Tarjetas Táctiles */}
            <div className="md:hidden divide-y divide-border/20 p-3 space-y-3">
              {data.sires.map((sire, index) => (
                <div
                  key={sire.sire_id}
                  className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Badge variant="outline" className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg border-indigo-500/20 font-black bg-indigo-500/5 text-indigo-600">
                        #{index + 1}
                      </Badge>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedAnimalId(sire.sire_id)}
                          className="font-black text-sm text-foreground hover:text-indigo-600 hover:underline text-left block truncate"
                        >
                          {sire.record}
                        </button>
                        <span className="text-[11px] text-muted-foreground block truncate">{sire.breed}</span>
                      </div>
                    </div>
                    <Badge className={`${getGradeBadgeClass(sire.grade)} font-black uppercase text-[10px] tracking-wide rounded-lg px-2 py-0.5 shrink-0`}>
                      CLASE {sire.grade}
                    </Badge>
                  </div>

                  {/* Barra de Tasa de Preñez */}
                  <div className="space-y-1 bg-background/60 p-2.5 rounded-lg border border-border/40">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Efectividad de Preñez:</span>
                      <span className={`font-black ${
                        sire.conception_rate_pct >= 60 ? 'text-emerald-600' : sire.conception_rate_pct >= 50 ? 'text-amber-500' : 'text-rose-600'
                      }`}>
                        {sire.conception_rate_pct}% ({sire.positive_diagnoses} de {sire.inseminations} serv.)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          sire.conception_rate_pct >= 60 ? 'bg-emerald-500' : sire.conception_rate_pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(sire.conception_rate_pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Cuadrícula de Métricas de Campo */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-background/70 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Crías Nacidas</span>
                      <span className="text-sm font-black text-foreground">{sire.total_offspring}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-background/70 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Peso Prom. Crías</span>
                      <span className="text-sm font-black text-foreground">
                        {sire.avg_birth_weight_kg > 0 ? `${sire.avg_birth_weight_kg} kg` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Alerta de Baja Efectividad si aplica */}
                  {sire.grade === 'D' && sire.inseminations >= 2 && (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                      <span>Alerta: Tasa baja. Sugerido descanso o examen andrológico.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* VISTA ESCRITORIO (>=md): Tabla Estructurada */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 text-[11px] font-black uppercase tracking-wider text-muted-foreground border-b border-border/20">
                    <th className="px-6 py-4">Toro</th>
                    <th className="px-6 py-4">Raza</th>
                    <th className="px-6 py-4 text-center">Inseminaciones</th>
                    <th className="px-6 py-4 text-center">Positivos</th>
                    <th className="px-6 py-4 text-center">Tasa Preñez</th>
                    <th className="px-6 py-4 text-center">Crías</th>
                    <th className="px-6 py-4 text-center">Peso Prom</th>
                    <th className="px-6 py-4 text-center">Calidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-sm">
                  {data.sires.map((sire, index) => (
                    <tr key={sire.sire_id} className="hover:bg-primary/[0.01] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-7 h-7 flex items-center justify-center rounded-lg border-indigo-500/20 font-bold bg-indigo-500/5 text-indigo-600">
                            #{index + 1}
                          </Badge>
                          <span
                            onClick={() => setSelectedAnimalId(sire.sire_id)}
                            className="font-bold text-foreground hover:text-indigo-600 hover:underline cursor-pointer"
                          >
                            {sire.record}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{sire.breed}</td>
                      <td className="px-6 py-4 text-center font-medium">{sire.inseminations}</td>
                      <td className="px-6 py-4 text-center font-medium text-emerald-600">{sire.positive_diagnoses}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-black ${
                          sire.conception_rate_pct >= 60
                            ? 'text-emerald-600'
                            : sire.conception_rate_pct >= 50
                              ? 'text-amber-500'
                              : 'text-rose-600'
                        }`}>
                          {sire.conception_rate_pct}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">{sire.total_offspring}</td>
                      <td className="px-6 py-4 text-center font-medium text-muted-foreground">
                        {sire.avg_birth_weight_kg > 0 ? `${sire.avg_birth_weight_kg} kg` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge className={`${getGradeBadgeClass(sire.grade)} font-black uppercase text-[11px] tracking-wider rounded-lg`}>
                          CLASE {sire.grade}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <div className="p-3 sm:p-4 bg-muted/20 border-t border-border/30 text-center">
            <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">VillaLuz Ganadería · Control Reproductivo</p>
          </div>
        </Card>
      </motion.div>

      {/* Leyenda de calificaciones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Star className="h-4 w-4 text-indigo-500" />
              Criterios de Calificación de Toros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { grade: 'A', desc: '≥70% preñez, ≥5 insem', badge: 'success' },
                { grade: 'B', desc: '≥60% preñez, ≥3 insem', badge: 'info' },
                { grade: 'C', desc: '≥50% preñez, ≥2 insem', badge: 'warning' },
                { grade: 'D', desc: '<50% preñez', badge: 'danger' }
              ].map((item) => (
                <div key={item.grade} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/20">
                  <Badge className={`${getStatusBadgeClass(item.badge as any)} font-black w-8 h-8 flex items-center justify-center rounded-xl`}>
                    {item.grade}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-semibold">{item.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal de Detalle Animal */}
      {selectedAnimalId && (
        <AnimalDetailModal
          isOpen={Boolean(selectedAnimalId)}
          onOpenChange={(open) => {
            if (!open) setSelectedAnimalId(null);
          }}
          animalId={selectedAnimalId}
        />
      )}
    </div>
  );
}
