import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/ui/cn';
import { BarChart3 } from 'lucide-react';

interface MilkTrendData {
  date: string;
  total_liters: number;
  record_count: number;
  animal_count: number;
}

interface MilkTrendChartProps {
  data: MilkTrendData[];
  isLoading?: boolean;
  period?: 'week' | 'month';
  onPeriodChange?: (period: 'week' | 'month') => void;
}

export function MilkTrendChart({
  data,
  isLoading = false,
  period = 'week',
  onPeriodChange,
}: MilkTrendChartProps) {
  const hasNoData = !data || data.length === 0;

  const parseDateName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          return parsed.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
        }
        return dateStr;
      }
      return date.toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const chartData = data.map((item) => ({
    ...item,
    name: parseDateName(item.date),
  }));

  const totalLiters = data.reduce((sum, item) => sum + item.total_liters, 0);
  const avgLiters = data.length > 0 ? totalLiters / data.length : 0;

  return (
    <Card className={cn("overflow-hidden border border-gray-100 shadow-sm", hasNoData && "border-amber-100 bg-amber-50/5")}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base md:text-lg font-bold text-gray-800">
              Tendencia de Producción Láctea
            </CardTitle>
          </div>
          {!hasNoData && (
            <p className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">
              Total: <span className="font-bold text-emerald-600">{totalLiters.toFixed(1)} L</span> | Promedio: <span className="font-bold text-emerald-600">{avgLiters.toFixed(1)} L/día</span>
            </p>
          )}
        </div>
        {onPeriodChange && !hasNoData && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Label htmlFor="period" className="text-xs font-semibold text-gray-600">
              Período:
            </Label>
            <Select value={period} onValueChange={(v) => onPeriodChange(v as 'week' | 'month')}>
              <SelectTrigger className="w-28 h-9 text-xs rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-sm font-semibold text-gray-400 animate-pulse">Cargando datos...</div>
          </div>
        ) : hasNoData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-500 mb-1">Sin datos de producción</p>
            <p className="text-xs text-gray-400 max-w-xs">
              El gráfico aparecerá cuando registres los primeros ordeños.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden select-none">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f9fafb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #f3f4f6',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    padding: '8px 12px',
                  }}
                  itemStyle={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#047857'
                  }}
                  labelStyle={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4b5563',
                    marginBottom: '4px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} Litros`, 'Producción']}
                />
                <Area
                  type="monotone"
                  dataKey="total_liters"
                  name="Litros totales"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLiters)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
