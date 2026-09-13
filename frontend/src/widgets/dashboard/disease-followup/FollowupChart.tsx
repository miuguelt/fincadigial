import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { FollowupChartPoint } from './types';

interface FollowupChartProps {
  series: FollowupChartPoint[];
}

/**
 * Curva de evolución clínica del episodio: peso y temperatura sobre la fecha.
 * Los puntos vienen del backend con la serie ordenada cronológicamente.
 */
export const FollowupChart: React.FC<FollowupChartProps> = ({ series }) => {
  if (!series || series.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground italic">
        Sin datos de evolución todavía. Registra un avance para ver el gráfico.
      </div>
    );
  }

  const data = series.map((point) => ({
    fecha: point.date?.slice(0, 10) || '',
    peso: point.weight,
    temperatura: point.temperature,
    estado: point.status || null,
  }));

  return (
    <div className="w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
          <YAxis
            yAxisId="peso"
            tick={{ fontSize: 10 }}
            label={{
              value: 'Peso (kg)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 9 },
            }}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            tick={{ fontSize: 10 }}
            label={{
              value: 'Temp (°C)',
              angle: 90,
              position: 'insideRight',
              style: { fontSize: 9 },
            }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 12 }}
            formatter={(value: any, name: any) =>
              name === 'Peso (kg)'
                ? [`${value ?? '—'} kg`, name]
                : [`${value ?? '—'} °C`, name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="peso"
            type="monotone"
            dataKey="peso"
            name="Peso (kg)"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperatura"
            name="Temperatura (°C)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
