import { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

interface AnimalMetric {
  name: string;
  production: number;
  health: number;
  reproduction: number;
  weight: number;
  age: number;
}

export interface AnimalMetricsRadarProps {
  data: AnimalMetric[];
  title?: string;
  height?: number;
}

export function AnimalMetricsRadar({
  data,
  title = 'Métricas de Animales',
  height = 350,
}: AnimalMetricsRadarProps) {
  const radarData = useMemo(() => {
    if (data.length === 0) return [];

    // Calcular promedios para cada métrica
    const averages = {
      name: 'Promedio',
      production: data.reduce((sum, a) => sum + a.production, 0) / data.length,
      health: data.reduce((sum, a) => sum + a.health, 0) / data.length,
      reproduction: data.reduce((sum, a) => sum + a.reproduction, 0) / data.length,
      weight: data.reduce((sum, a) => sum + a.weight, 0) / data.length,
      age: data.reduce((sum, a) => sum + a.age, 0) / data.length,
    };

    // Transformar para radar chart
    const metrics = [
      { subject: 'Producción', A: averages.production, fullMark: 100 },
      { subject: 'Salud', A: averages.health, fullMark: 100 },
      { subject: 'Reproducción', A: averages.reproduction, fullMark: 100 },
      { subject: 'Peso', A: averages.weight, fullMark: 100 },
      { subject: 'Edad', A: averages.age, fullMark: 100 },
    ];

    return metrics;
  }, [data]);

  const topPerformers = useMemo(() => {
    return [...data]
      .map(a => ({
        ...a,
        score: (a.production + a.health + a.reproduction + a.weight) / 4,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos de animales disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="text-sm text-muted-foreground">
          {data.length} animales analizados
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar Chart */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={height}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" className="text-xs" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                <Radar
                  name="Promedio General"
                  dataKey="A"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}`, '']}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performers */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Top Performers
            </h3>
            {topPerformers.map((animal, index) => (
              <div
                key={animal.name}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{animal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {animal.score.toFixed(1)}/100
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">
                    {animal.production.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Prod.</p>
                </div>
              </div>
            ))}

            {/* Métricas Detalladas */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Promedios
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Producción:</span>
                  <span className="font-medium">
                    {radarData.find(d => d.subject === 'Producción')?.A.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salud:</span>
                  <span className="font-medium">
                    {radarData.find(d => d.subject === 'Salud')?.A.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reproducción:</span>
                  <span className="font-medium">
                    {radarData.find(d => d.subject === 'Reproducción')?.A.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AnimalMetricsRadar;
