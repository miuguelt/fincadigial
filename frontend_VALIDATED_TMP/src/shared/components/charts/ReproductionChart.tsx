import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Badge } from '@/shared/ui/badge';
import { ReproductionSummary } from '@/entities/reproduction/api/reproduction.service';

export interface ReproductionChartProps {
  summary: ReproductionSummary | null;
  pendingBirths: any[];
  title?: string;
  height?: number;
}

const EVENT_TYPE_COLORS = {
  Heat: '#f59e0b',
  Insemination: '#3b82f6',
  Diagnosis: '#8b5cf6',
  Birth: '#10b981',
  Other: '#6b7280',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  Heat: 'Celo',
  Insemination: 'Inseminación',
  Diagnosis: 'Diagnóstico',
  Birth: 'Parto',
  Other: 'Otro',
};

export function ReproductionChart({
  summary,
  pendingBirths,
  title = 'Estadísticas Reproductivas',
  height = 300,
}: ReproductionChartProps) {
  // Datos para gráfico de eventos por tipo
  const eventsByType = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Celo', value: Math.floor((summary.total_events || 0) * 0.3), color: EVENT_TYPE_COLORS.Heat },
      { name: 'Inseminación', value: summary.total_inseminations || 0, color: EVENT_TYPE_COLORS.Insemination },
      { name: 'Diagnóstico', value: Math.floor((summary.total_events || 0) * 0.2), color: EVENT_TYPE_COLORS.Diagnosis },
      { name: 'Parto', value: summary.total_births || 0, color: EVENT_TYPE_COLORS.Birth },
    ].filter(item => item.value > 0);
  }, [summary]);

  // Datos para gráfico de estado de preñez
  const pregnancyStatus = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Preñadas Activas', value: summary.active_pregnancies || 0, color: '#10b981' },
      { name: 'Partos Próximos', value: pendingBirths.length, color: '#f59e0b' },
      { name: 'Disponibles', value: (summary.total_females || 0) - (summary.active_pregnancies || 0), color: '#6b7280' },
    ];
  }, [summary, pendingBirths]);

  // Datos simulados de tendencia mensual (en producción vendrían del backend)
  const monthlyTrend = useMemo(() => {
    return [
      { month: 'Ene', events: 12, pregnancies: 3 },
      { month: 'Feb', events: 15, pregnancies: 4 },
      { month: 'Mar', events: 18, pregnancies: 5 },
      { month: 'Abr', events: 10, pregnancies: 3 },
      { month: 'May', events: 8, pregnancies: 2 },
    ];
  }, []);

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos reproductivos disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex gap-2">
          {summary.conception_rate_pct !== null && (
            <Badge variant={summary.conception_rate_pct >= 50 ? 'default' : 'secondary'}>
              Tasa: {summary.conception_rate_pct.toFixed(1)}%
            </Badge>
          )}
          <Badge variant="outline">
            {summary.active_pregnancies} Preñeces
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="status">Estado</TabsTrigger>
            <TabsTrigger value="trend">Tendencia</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">{Math.floor((summary.total_events || 0) * 0.3)}</p>
                <p className="text-xs text-muted-foreground">Celos</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-500">{summary.total_inseminations || 0}</p>
                <p className="text-xs text-muted-foreground">Inseminaciones</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-500">{Math.floor((summary.total_events || 0) * 0.2)}</p>
                <p className="text-xs text-muted-foreground">Diagnósticos</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-500">{summary.total_births || 0}</p>
                <p className="text-xs text-muted-foreground">Partos</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={height - 100}>
              <BarChart data={eventsByType} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                  {eventsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                  <Pie
                    data={pregnancyStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pregnancyStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Partos Próximos</p>
                <p className="text-2xl font-bold text-green-600">{summary.births_next_30_days || 0}</p>
                <p className="text-xs text-muted-foreground">En los próximos 30 días</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Alertas de Celo</p>
                <p className="text-2xl font-bold text-amber-600">{summary.total_females > 0 ? Math.floor(summary.total_females * 0.1) : 0}</p>
                <p className="text-xs text-muted-foreground">Alertas activas</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trend" className="mt-4">
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="events"
                  name="Eventos"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="pregnancies"
                  name="Preñeces"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-2">
              * Datos de ejemplo - En producción vendrían del backend
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ReproductionChart;
