import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { MilkProduction } from '@/entities/milk/api/milk.service';

export interface MilkProductionChartProps {
  data: MilkProduction[];
  title?: string;
  showArea?: boolean;
  height?: number;
}

export function MilkProductionChart({
  data,
  title = 'Producción de Leche (Litros)',
  showArea = true,
  height = 300,
}: MilkProductionChartProps) {
  const chartData = useMemo(() => {
    // Agrupar por fecha y sesión
    const grouped = data.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = { date, AM: 0, PM: 0, Extra: 0, total: 0 };
      }
      acc[date][item.session] = item.liters;
      acc[date].total += item.liters;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);

  const totalLiters = useMemo(() => {
    return data.reduce((sum, item) => sum + item.liters, 0);
  }, [data]);

  const averagePerDay = useMemo(() => {
    if (chartData.length === 0) return 0;
    return totalLiters / chartData.length;
  }, [totalLiters, chartData.length]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos de producción disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="flex gap-4 text-sm">
          <div className="text-right">
            <p className="text-muted-foreground">Total</p>
            <p className="font-bold text-lg">{totalLiters.toFixed(1)} L</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Promedio/Día</p>
            <p className="font-bold text-lg">{averagePerDay.toFixed(1)} L</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {showArea ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorAM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorPM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number) => [`${value.toFixed(1)} L`, '']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="AM"
                name="Mañana (AM)"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorAM)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="PM"
                name="Tarde (PM)"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorPM)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Diario"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTotal)"
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number) => [`${value.toFixed(1)} L`, '']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="AM"
                name="Mañana (AM)"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="PM"
                name="Tarde (PM)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Total Diario"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default MilkProductionChart;
