import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { useCallback } from 'react';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Plus,
  Heart,
  Calendar,
  Sparkles,
  Award
} from 'lucide-react';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AssistedCalvingForm from '@/widgets/reproduction/AssistedCalvingForm';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { motion } from 'framer-motion';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { getTotalInseminations } from '@/pages/dashboard/admin/analytics/components/analyticsAdapters';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface FertilityData {
  period_months: number;
  conception_rate_pct: number;
  conception_by_technique: {
    natural: number;
    artificial: number;
  };
  avg_interval_between_births_days: number;
  perinatal_mortality_rate_pct: number;
  events_by_month: Record<string, number>;
  top_females: Array<{
    animal_id: number;
    record: string;
    inseminations: number;
    positive: number;
    rate: number;
  }>;
  bottom_females: Array<{
    animal_id: number;
    record: string;
    inseminations: number;
    positive: number;
    rate: number;
  }>;
}

export default function FertilityDashboard() {
  const { goTo } = useRoleNavigation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<FertilityData | null>(null);
  const [isCalvingModalOpen, setIsCalvingModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reproductionService.getFertilityDashboard(months);
      setData(response as FertilityData);
    } catch (error) {
      console.error('Error loading fertility dashboard:', error);
      showToast('Error al cargar dashboard de fertilidad', 'error');
    } finally {
      setLoading(false);
    }
  }, [months, showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const monthlyData = data?.events_by_month
    ? Object.entries(data.events_by_month).map(([month, count]) => ({ month, count }))
    : [];

  const techniqueData = data?.conception_by_technique
    ? [
        { name: 'Natural', value: data.conception_by_technique.natural },
        { name: 'Artificial', value: data.conception_by_technique.artificial },
      ]
    : [];

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground animate-pulse">
        <Activity className="h-10 w-10 text-primary animate-spin" />
        <p className="font-semibold text-sm">Cargando métricas reproductivas...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden">
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
        icon={<Heart className="h-5 w-5 text-white" />}
        iconClassName="from-pink-500 to-rose-600 shadow-pink-500/20"
        title={<>Dashboard de <span className="text-pink-600">Fertilidad</span></>}
        description="Auditoría reproductiva y seguimiento de partos"
        actions={
          <>
          <Dialog open={isCalvingModalOpen} onOpenChange={setIsCalvingModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg h-9 gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold transition-all shadow-lg shadow-pink-600/20">
                <Plus className="h-4 w-4" />
                Registrar Parto Asistido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto rounded-[2rem] border border-border shadow-2xl">
              <DialogHeader className="p-6 pb-2 border-b bg-gradient-to-r from-pink-600 to-rose-600 text-white">
                <DialogTitle className="text-xl font-bold">Registrar Parto Asistido</DialogTitle>
              </DialogHeader>
              <div className="p-6">
                <AssistedCalvingForm
                  onComplete={() => {
                    setIsCalvingModalOpen(false);
                    loadDashboard();
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>

          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-lg bg-background/50 border-border/50 font-semibold focus:ring-pink-500/20">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border">
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          </>
        }
      />

      {/* KPI Cards Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            title: 'Tasa de Preñez',
            value: `${data.conception_rate_pct}%`,
            subtitle: 'Meta recomendada: >60%',
            borderColor: data.conception_rate_pct >= 60 ? 'border-l-emerald-500' : 'border-l-amber-500',
            bg: data.conception_rate_pct >= 60 ? 'bg-emerald-500/5' : 'bg-amber-500/5',
            icon: data.conception_rate_pct >= 60 ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-amber-500" />
          },
          {
            title: 'Intervalo entre Partos',
            value: `${data.avg_interval_between_births_days} días`,
            subtitle: 'Promedio del ganado',
            borderColor: 'border-l-blue-500',
            bg: 'bg-blue-500/5',
            icon: <Calendar className="w-5 h-5 text-blue-600" />
          },
          {
            title: 'Mortalidad Perinatal',
            value: `${data.perinatal_mortality_rate_pct}%`,
            subtitle: 'Meta recomendada: <5%',
            borderColor: data.perinatal_mortality_rate_pct <= 5 ? 'border-l-emerald-500' : 'border-l-rose-500',
            bg: data.perinatal_mortality_rate_pct <= 5 ? 'bg-emerald-500/5' : 'bg-rose-500/5',
            icon: data.perinatal_mortality_rate_pct <= 5 ? <Activity className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />
          },
          {
            title: 'Inseminaciones Totales',
            value: getTotalInseminations(data),
            subtitle: `En el período analizado`,
            borderColor: 'border-l-pink-500',
            bg: 'bg-pink-500/5',
            icon: <Sparkles className="w-5 h-5 text-pink-600" />
          }
        ].map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={`border-border/50 border-l-4 ${card.borderColor} shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardDescription className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground">{card.title}</CardDescription>
                <div className={`p-2 rounded-xl ${card.bg}`}>{card.icon}</div>
              </CardHeader>
              <CardContent className="pb-4">
                <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">{card.value}</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1 font-semibold">{card.subtitle}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Gráficos de Reproducción */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Eventos de Inseminación */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-pink-500" />
                Historial de Inseminaciones
              </CardTitle>
              <CardDescription>Eventos registrados mes a mes</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <YAxis style={{ fontSize: '10px' }} />
                    <ChartTooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#EC4899" radius={[4, 4, 0, 0]} name="Inseminaciones" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasa por Técnica */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden flex flex-col justify-between">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Tasa de Preñez por Técnica
              </CardTitle>
              <CardDescription>Eficiencia en monta natural vs inseminación artificial</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center">
              {techniqueData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-full">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={techniqueData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {techniqueData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2.5 text-xs w-full max-w-[180px]">
                    {techniqueData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-bold text-foreground">{entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-12">Sin datos de técnicas de preñez</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Rankings de Hembras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hembras Fértiles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 border-b border-border/30">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                Top Hembras Más Fértiles
              </CardTitle>
              <CardDescription>Mayor índice de éxito reproductivo</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {data.top_females.map((female, index) => (
                <div
                  key={female.animal_id}
                  onClick={() => goTo(`/admin/animals/${female.animal_id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusBadgeClass('success') + " rounded-lg"}>#{index + 1}</Badge>
                    <div>
                      <p className="font-bold text-sm text-foreground">{female.record}</p>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase mt-0.5">
                        {female.inseminations} insem • {female.positive} positivas
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusBadgeClass('success') + " text-xs font-black"}>{female.rate}%</Badge>
                </div>
              ))}
              {data.top_females.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No hay datos suficientes</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Hembras con Alerta Reproductiva */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-border/50 shadow-xl shadow-primary/5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 border-b border-border/30">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Alertas Reproductivas (Baja Fertilidad)
              </CardTitle>
              <CardDescription>Hembras con baja tasa de concepción</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {data.bottom_females.map((female, index) => (
                <div
                  key={female.animal_id}
                  onClick={() => goTo(`/admin/animals/${female.animal_id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusBadgeClass('danger') + " rounded-lg"}>#{index + 1}</Badge>
                    <div>
                      <p className="font-bold text-sm text-foreground">{female.record}</p>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase mt-0.5">
                        {female.inseminations} insem • {female.positive} positivas
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusBadgeClass('danger') + " text-xs font-black"}>{female.rate}%</Badge>
                </div>
              ))}
              {data.bottom_females.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No hay alertas activas</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
