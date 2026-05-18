import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Activity, Baby, AlertTriangle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AssistedCalvingForm from '@/widgets/reproduction/AssistedCalvingForm';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<FertilityData | null>(null);
  const [isCalvingModalOpen, setIsCalvingModalOpen] = useState(false);

  const loadDashboard = async () => {
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
  };

  useEffect(() => {
    loadDashboard();
  }, [months]);

  // Preparar datos para gráficos
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reproduction')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Dashboard de Fertilidad</h1>
            <p className="text-muted-foreground">Métricas reproductivas del hato</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isCalvingModalOpen} onOpenChange={setIsCalvingModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Parto Asistido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
              <DialogHeader className="p-6 pb-0 border-b">
                <DialogTitle className="sr-only">Registrar Parto Asistido</DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-0">
                <AssistedCalvingForm onComplete={() => {
                  setIsCalvingModalOpen(false);
                  loadDashboard();
                }} />
              </div>
            </DialogContent>
          </Dialog>

          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Preñez</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{data.conception_rate_pct}%</div>
              {data.conception_rate_pct >= 60 ? (
                <TrendingUp className="h-5 w-5 text-success-500 dark:text-success-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-danger-500 dark:text-danger-400" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Meta: &gt;60%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Intervalo entre Partos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.avg_interval_between_births_days}</div>
            <p className="text-xs text-muted-foreground mt-1">días promedio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mortalidad Perinatal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{data.perinatal_mortality_rate_pct}%</div>
              {data.perinatal_mortality_rate_pct <= 5 ? (
                <Activity className="h-5 w-5 text-success-500 dark:text-success-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-danger-500 dark:text-danger-400" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Meta: &lt;5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inseminaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.top_females.reduce((sum, f) => sum + f.inseminations, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">en {data.period_months} meses</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Eventos por Mes</CardTitle>
            <CardDescription>Inseminaciones registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Inseminaciones" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasa de Preñez por Técnica</CardTitle>
            <CardDescription>Comparación Natural vs Artificial</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={techniqueData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {techniqueData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Hembras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success-500 dark:text-success-400" />
              Top 5 Hembras Más Fértiles
            </CardTitle>
            <CardDescription>Mayor tasa de preñez</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.top_females.map((female, index) => (
                <div key={female.animal_id} className="flex items-center justify-between p-3 bg-success-50 dark:bg-success-950/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusBadgeClass('success')}>#{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{female.record}</p>
                      <p className="text-xs text-muted-foreground">
                        {female.inseminations} insem, {female.positive} positivas
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusBadgeClass('success')}>{female.rate}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-danger-500 dark:text-danger-400" />
              Hembras con Problemas Reproductivos
            </CardTitle>
            <CardDescription>Menor tasa de preñez</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.bottom_females.length > 0 ? (
                data.bottom_females.map((female, index) => (
                  <div key={female.animal_id} className="flex items-center justify-between p-3 bg-danger-50 dark:bg-danger-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusBadgeClass('danger')}>#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{female.record}</p>
                        <p className="text-xs text-muted-foreground">
                          {female.inseminations} insem, {female.positive} positivas
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusBadgeClass('danger')}>{female.rate}%</Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No hay datos suficientes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
