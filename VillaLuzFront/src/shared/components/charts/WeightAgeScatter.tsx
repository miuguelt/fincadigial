import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
  Label,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

interface AnimalData {
  id: number;
  name: string;
  age: number; // meses
  weight: number; // kg
  production: number; // litros/día
  sex: 'Macho' | 'Hembra';
  breed: string;
}

export interface WeightAgeScatterProps {
  data: AnimalData[];
  title?: string;
  height?: number;
}

type FilterType = 'all' | 'male' | 'female';

export function WeightAgeScatter({
  data,
  title = 'Correlación Peso vs Edad',
  height = 400,
}: WeightAgeScatterProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredData = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter(a => filter === 'male' ? a.sex === 'Macho' : a.sex === 'Hembra');
  }, [data, filter]);

  const chartData = useMemo(() => {
    return filteredData.map(animal => ({
      x: animal.age,
      y: animal.weight,
      z: animal.production,
      name: animal.name,
      sex: animal.sex,
      breed: animal.breed,
    }));
  }, [filteredData]);

  const statistics = useMemo(() => {
    if (filteredData.length === 0) return null;

    const avgWeight = filteredData.reduce((sum, a) => sum + a.weight, 0) / filteredData.length;
    const avgAge = filteredData.reduce((sum, a) => sum + a.age, 0) / filteredData.length;
    const avgProduction = filteredData.reduce((sum, a) => sum + a.production, 0) / filteredData.length;

    // Calcular correlación (simplificada)
    const n = filteredData.length;
    const sumX = filteredData.reduce((sum, a) => sum + a.age, 0);
    const sumY = filteredData.reduce((sum, a) => sum + a.weight, 0);
    const sumXY = filteredData.reduce((sum, a) => sum + a.age * a.weight, 0);
    const sumX2 = filteredData.reduce((sum, a) => sum + a.age * a.age, 0);
    const sumY2 = filteredData.reduce((sum, a) => sum + a.weight * a.weight, 0);

    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return {
      avgWeight,
      avgAge,
      avgProduction,
      correlation: isNaN(correlation) ? 0 : correlation,
      count: n,
    };
  }, [filteredData]);

  const males = data.filter(a => a.sex === 'Macho').length;
  const females = data.filter(a => a.sex === 'Hembra').length;

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
        <div>
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Tamaño del punto = Producción diaria
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={filter === 'male' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('male')}
            >
              Machos ({males})
            </Button>
            <Button
              variant={filter === 'female' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('female')}
            >
              Hembras ({females})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Scatter Chart */}
          <div className="lg:col-span-3">
            <ResponsiveContainer width="100%" height={height}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Edad"
                  unit=" meses"
                  domain={[0, 'auto']}
                  className="text-xs"
                >
                  <Label value="Edad (meses)" position="bottom" offset={0} />
                </XAxis>
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Peso"
                  unit=" kg"
                  domain={[0, 'auto']}
                  className="text-xs"
                >
                  <Label value="Peso (kg)" angle={-90} position="insideLeft" />
                </YAxis>
                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Producción" unit=" L" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.breed}</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p>Edad: {data.x} meses</p>
                            <p>Peso: {data.y} kg</p>
                            <p>Producción: {data.z} L/día</p>
                            <Badge variant={data.sex === 'Macho' ? 'default' : 'secondary'}>
                              {data.sex}
                            </Badge>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                {/* Línea de tendencia promedio */}
                {statistics && (
                  <ReferenceLine
                    y={statistics.avgWeight}
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                    label={{ value: `Peso promedio: ${statistics.avgWeight.toFixed(1)}kg`, position: 'right' }}
                  />
                )}
                
                <Scatter
                  name="Animales"
                  data={chartData}
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Estadísticas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Estadísticas
            </h3>
            
            {statistics && (
              <>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Promedio Peso</p>
                    <p className="text-xl font-bold">{statistics.avgWeight.toFixed(1)} kg</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Promedio Edad</p>
                    <p className="text-xl font-bold">{statistics.avgAge.toFixed(1)} meses</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Producción Media</p>
                    <p className="text-xl font-bold">{statistics.avgProduction.toFixed(1)} L</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Correlación Peso-Edad</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-info rounded-full"
                        style={{ width: `${Math.abs(statistics.correlation) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {statistics.correlation.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.abs(statistics.correlation) > 0.7 
                      ? 'Fuerte correlación' 
                      : Math.abs(statistics.correlation) > 0.4 
                        ? 'Correlación moderada' 
                        : 'Correlación débil'}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {statistics.count} de {data.length} animales
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeightAgeScatter;
