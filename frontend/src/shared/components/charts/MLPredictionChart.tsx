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
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { PredictionResponse } from '@/entities/ml/api/ml.service';

interface MLPredictionChartProps {
  data: PredictionResponse | null;
  showConfidence?: boolean;
  height?: number;
}

export function MLPredictionChart({
  data,
  showConfidence = true,
  height = 400,
}: MLPredictionChartProps) {
  const chartData = useMemo(() => {
    if (!data?.predictions) return [];

    const amData = data.predictions.am;
    const pmData = data.predictions.pm;

    // Combinar datos AM y PM por fecha
    const combined = amData.map((am, index) => {
      const pm = pmData[index];
      return {
        date: am.date,
        am: am.predicted_liters,
        pm: pm?.predicted_liters || 0,
        total: am.predicted_liters + (pm?.predicted_liters || 0),
        am_lower: am.confidence_lower,
        am_upper: am.confidence_upper,
        pm_lower: pm?.confidence_lower || 0,
        pm_upper: pm?.confidence_upper || 0,
        confidence: am.confidence,
      };
    });

    return combined;
  }, [data]);

  const stats = useMemo(() => {
    if (!data?.predictions) return null;

    const totalAm = data.predictions.am.reduce((sum, p) => sum + p.predicted_liters, 0);
    const totalPm = data.predictions.pm.reduce((sum, p) => sum + p.predicted_liters, 0);
    const total = totalAm + totalPm;
    
    const firstTotal = (data.predictions.am[0]?.predicted_liters || 0) + 
                      (data.predictions.pm[0]?.predicted_liters || 0);
    const lastTotal = (data.predictions.am[data.predictions.am.length - 1]?.predicted_liters || 0) + 
                     (data.predictions.pm[data.predictions.pm.length - 1]?.predicted_liters || 0);
    
    const trend = firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0;
    
    return {
      total,
      average: total / 7,
      trend,
      confidence: data.predictions.am[0]?.confidence || 'low',
      modelR2: data.model_metrics?.r2 || 0,
    };
  }, [data]);

  const confidenceColor = useMemo(() => {
    switch (stats?.confidence) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }, [stats?.confidence]);

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Predicciones ML</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No hay datos de predicción disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            Predicciones ML - Próximos 7 Días
            <Badge className={confidenceColor}>
              {stats?.confidence === 'high' ? 'Alta Confianza' : 
               stats?.confidence === 'medium' ? 'Confianza Media' : 'Baja Confianza'}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Modelo: Regresión Polinomial (R²: {stats?.modelR2?.toFixed(3)})
          </p>
        </div>
        
        <div className="flex gap-4 text-sm">
          <div className="text-right">
            <p className="text-muted-foreground">Total 7 días</p>
            <p className="font-bold text-lg">{stats?.total?.toFixed(1)} L</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Promedio/Día</p>
            <p className="font-bold text-lg">{stats?.average?.toFixed(1)} L</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Alerta de tendencia */}
        {stats && Math.abs(stats.trend) > 5 && (
          <Alert className={`mb-4 ${stats.trend > 0 ? 'border-green-500' : 'border-red-500'}`}>
            {stats.trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <AlertTitle>
              {stats.trend > 0 ? 'Tendencia al Alza' : 'Tendencia a la Baja'}
            </AlertTitle>
            <AlertDescription>
              Se espera un cambio del {Math.abs(stats.trend).toFixed(1)}% en la producción.
              {stats.trend < 0 && ' Considere revisar alimentación y salud del animal.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Gráfico */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).toLocaleDateString('es-CO', { 
                month: 'short', 
                day: 'numeric' 
              })}
              className="text-xs"
            />
            <YAxis
              className="text-xs"
              tickFormatter={(value) => `${value.toFixed(0)} L`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-medium">
                        {new Date(label).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>AM: {data.am?.toFixed(1)} L</p>
                        <p>PM: {data.pm?.toFixed(1)} L</p>
                        <p className="font-semibold">Total: {data.total?.toFixed(1)} L</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confianza: {data.confidence}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            
            {/* Línea promedio */}
            <ReferenceLine
              y={stats?.average}
              stroke="#6b7280"
              strokeDasharray="5 5"
              label={{ value: `Promedio: ${stats?.average?.toFixed(1)}L`, position: 'right' }}
            />
            
            {/* Área de confianza AM */}
            {showConfidence && (
              <Area
                type="monotone"
                dataKey="am_upper"
                stroke="transparent"
                fill="#10b981"
                fillOpacity={0.1}
                name="Confianza AM"
              />
            )}
            
            {/* Línea AM */}
            <Line
              type="monotone"
              dataKey="am"
              name="Mañana (AM)"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            
            {/* Línea PM */}
            <Line
              type="monotone"
              dataKey="pm"
              name="Tarde (PM)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
              activeDot={{ r: 6 }}
            />
            
            {/* Línea Total */}
            <Line
              type="monotone"
              dataKey="total"
              name="Total Diario"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Recomendaciones del modelo */}
        {data.trend_analysis?.recommendation && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Recomendación del Modelo:</p>
            <p className="text-sm text-muted-foreground">
              {data.trend_analysis.recommendation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MLPredictionChart;
