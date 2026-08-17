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

export function ReproductionChart({
  summary,
  pendingBirths,
  title = 'Estadísticas Reproductivas',
  height = 300,
}: ReproductionChartProps) {
  // Datos para gráfico de eventos por tipo
  // Sin datos simulados de tendencia mensual (eliminados)
  const pregnancyStatus = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Preñadas Activas', value: summary.active_pregnancies || 0, color: '#10b981' },
      { name: 'Partos Próximos', value: pendingBirths.length, color: '#f59e0b' },
      { name: 'Disponibles', value: (summary.total_females || 0) - (summary.active_pregnancies || 0), color: '#6b7280' },
    ];
  }, [summary, pendingBirths]);

  const eventsByType = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'Celo', value: (summary as any).total_heats || 0, color: EVENT_TYPE_COLORS.Heat },
      { name: 'Inseminación', value: summary.total_inseminations || 0, color: EVENT_TYPE_COLORS.Insemination },
      { name: 'Diagnóstico', value: (summary as any).total_diagnoses || 0, color: EVENT_TYPE_COLORS.Diagnosis },
      { name: 'Parto', value: summary.total_births || 0, color: EVENT_TYPE_COLORS.Birth },
    ].filter(item => item.value > 0);
  }, [summary]);

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="status">Estado</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-warning">{(summary as any).total_heats || 0}</p>
                <p className="text-xs text-muted-foreground">Celos</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-info">{summary.total_inseminations || 0}</p>
                <p className="text-xs text-muted-foreground">Inseminaciones</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-500">{(summary as any).total_diagnoses || 0}</p>
                <p className="text-xs text-muted-foreground">Diagnósticos</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-success">{summary.total_births || 0}</p>
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
              <div className="bg-success/5 dark:bg-green-950 rounded-lg p-3">
                <p className="text-sm font-medium text-success dark:text-green-300">Partos Próximos</p>
                <p className="text-2xl font-bold text-success">{summary.births_next_30_days || 0}</p>
                <p className="text-xs text-muted-foreground">En los próximos 30 días</p>
              </div>
              <div className="bg-destructive/5 dark:bg-red-950 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive dark:text-red-300">Partos Vencidos</p>
                <p className="text-2xl font-bold text-destructive">{summary.overdue_births || 0}</p>
                <p className="text-xs text-muted-foreground">Partos retrasados</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ReproductionChart;
