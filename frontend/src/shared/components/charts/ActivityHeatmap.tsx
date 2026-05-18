import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

interface ActivityData {
  date: string;
  hour: number;
  value: number; // 0-100 nivel de actividad
  type: 'feeding' | 'milking' | 'movement' | 'rest';
}

export interface ActivityHeatmapProps {
  data: ActivityData[];
  title?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const ACTIVITY_COLORS = {
  low: '#e5e7eb',      // gray-200
  medium: '#fbbf24',   // amber-400
  high: '#f59e0b',     // amber-500
  veryHigh: '#ef4444',  // red-500
};

const ACTIVITY_LABELS: Record<string, string> = {
  feeding: 'Alimentación',
  milking: 'Ordeño',
  movement: 'Movimiento',
  rest: 'Descanso',
};

export function ActivityHeatmap({
  data,
  title = 'Mapa de Calor de Actividad',
}: ActivityHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Crear matriz de 7 días x 24 horas
    const matrix: (ActivityData | null)[][] = Array(7)
      .fill(null)
      .map(() => Array(24).fill(null));

    // Agrupar datos por día y hora
    data.forEach(item => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay(); // 0 = Domingo
      const hour = item.hour;

      if (dayOfWeek < 7 && hour < 24) {
        matrix[dayOfWeek][hour] = item;
      }
    });

    return matrix;
  }, [data]);

  const stats = useMemo(() => {
    const total = data.length;
    const byType = data.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgActivity = total > 0 
      ? data.reduce((sum, item) => sum + item.value, 0) / total 
      : 0;

    const peakHour = data.length > 0
      ? data.reduce((max, item) => item.value > max.value ? item : max, data[0])
      : null;

    return { total, byType, avgActivity, peakHour };
  }, [data]);

  const getColor = (value: number, type: string) => {
    if (value === 0) return ACTIVITY_COLORS.low;
    if (value < 30) return type === 'rest' ? '#dbeafe' : ACTIVITY_COLORS.low;
    if (value < 60) return ACTIVITY_COLORS.medium;
    if (value < 80) return ACTIVITY_COLORS.high;
    return ACTIVITY_COLORS.veryHigh;
  };

  const getActivityLevel = (value: number) => {
    if (value === 0) return 'Sin actividad';
    if (value < 30) return 'Baja';
    if (value < 60) return 'Moderada';
    if (value < 80) return 'Alta';
    return 'Muy alta';
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos de actividad disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Actividad por hora durante la última semana
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: ACTIVITY_COLORS.low }} />
            <span className="text-xs">Baja</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: ACTIVITY_COLORS.medium }} />
            <span className="text-xs">Media</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: ACTIVITY_COLORS.high }} />
            <span className="text-xs">Alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: ACTIVITY_COLORS.veryHigh }} />
            <span className="text-xs">Muy alta</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-4">
            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header - Horas */}
                <div className="flex">
                  <div className="w-12 flex-shrink-0" /> {/* Espacio para días */}
                  {HOURS.map(hour => (
                    <div
                      key={hour}
                      className="w-8 flex-shrink-0 text-center text-xs text-muted-foreground"
                    >
                      {hour % 3 === 0 ? `${hour}h` : ''}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                {DAYS.map((day, dayIndex) => (
                  <div key={day} className="flex items-center">
                    <div className="w-12 flex-shrink-0 text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                    <div className="flex gap-0.5">
                      {HOURS.map(hour => {
                        const activity = heatmapData[dayIndex][hour];
                        const value = activity?.value || 0;
                        const type = activity?.type || 'rest';

                        return (
                          <Tooltip key={hour}>
                            <TooltipTrigger asChild>
                              <div
                                className="w-7 h-7 rounded-sm cursor-pointer transition-all hover:scale-110 hover:ring-2 hover:ring-primary"
                                style={{ backgroundColor: getColor(value, type) }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {day} {hour}:00 - {hour + 1}:00
                                </p>
                                <p className="text-sm">
                                  Actividad: {getActivityLevel(value)} ({value}%)
                                </p>
                                {activity && (
                                  <p className="text-xs text-muted-foreground">
                                    Tipo: {ACTIVITY_LABELS[type] || type}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen de Actividad */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Actividad Promedio</p>
                <p className="text-2xl font-bold">{stats.avgActivity.toFixed(1)}%</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Hora Pico</p>
                <p className="text-2xl font-bold">
                  {stats.peakHour ? `${stats.peakHour.hour}:00` : 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Tipo Principal</p>
                <p className="text-lg font-bold">
                  {Object.entries(stats.byType).sort((a, b) => b[1] - a[1])[0]?.[0] 
                    ? ACTIVITY_LABELS[Object.entries(stats.byType).sort((a, b) => b[1] - a[1])[0][0]] 
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Leyenda de Tipos */}
            <div className="flex flex-wrap gap-4 pt-2">
              {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor:
                        key === 'feeding' ? '#10b981' :
                        key === 'milking' ? '#3b82f6' :
                        key === 'movement' ? '#f59e0b' :
                        '#6b7280'
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

export default ActivityHeatmap;
