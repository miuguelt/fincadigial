import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Clock, PieChart as PieIcon } from 'lucide-react';
import type { HealthStatistics } from '@/shared/api/generated/swaggerTypes';

const SEVERITY_COLORS: Record<string, string> = {
  Leve: '#10b981',
  Moderada: '#0ea5e9',
  Severa: '#f59e0b',
  Crítica: '#f43f5e',
  'No registrada': '#94a3b8',
};

const ChartCard = ({
  icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`min-w-0 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 ${className || ''}`}
  >
    <div className="mb-3 flex items-center gap-2">
      <span className="p-1.5 rounded-lg bg-primary/10 text-primary">{icon}</span>
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider">{title}</h2>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-border/60 text-xs italic text-muted-foreground">
    {message}
  </div>
);

const tooltipStyle = {
  fontSize: 11,
  borderRadius: 12,
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
};

interface DiseaseAnalyticsProps {
  stats: HealthStatistics['disease_episodes'] | null;
  loading: boolean;
}

/**
 * Panel de analítica del seguimiento sanitario: casos nuevos por mes,
 * distribución de gravedad y duración promedio de los casos por enfermedad.
 */
export const DiseaseAnalytics: React.FC<DiseaseAnalyticsProps> = ({ stats, loading }) => {
  const monthly = useMemo(
    () => (stats?.by_month || []).map((m) => ({ mes: m.period.slice(5), label: m.period, casos: m.count })),
    [stats?.by_month]
  );

  const severity = useMemo(
    () =>
      Object.entries(stats?.by_severity || {}).map(([name, value]) => ({
        name,
        value,
        color: SEVERITY_COLORS[name] || '#94a3b8',
      })),
    [stats?.by_severity]
  );

  const durations = useMemo(
    () => (stats?.avg_duration_by_disease || []).slice(0, 8).reverse(),
    [stats?.avg_duration_by_disease]
  );

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[210px] animate-pulse rounded-xl border border-border/50 bg-muted/30" />
        ))}
      </div>
    );
  }

  const hasData = (stats?.total || 0) > 0;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {/* Casos por mes */}
      <ChartCard
        icon={<Activity className="h-4 w-4" />}
        title="Casos nuevos por mes"
        subtitle="Diagnósticos de enfermedades (últimos 12 meses)"
        className="lg:col-span-2"
      >
        {!hasData ? (
          <EmptyChart message="Aún no hay casos registrados." />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={monthly} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                formatter={(value: any) => [`${value} casos`, '']}
                labelFormatter={(label: any) => `Mes ${label}`}
              />
              <Bar dataKey="casos" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Distribución por gravedad */}
      <ChartCard
        icon={<PieIcon className="h-4 w-4" />}
        title="Distribución por gravedad"
        subtitle="Todos los episodios de la finca"
      >
        {!hasData ? (
          <EmptyChart message="Sin episodios con gravedad registrada." />
        ) : (
          <>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severity}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {severity.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Duración promedio</span>
              <span className="font-bold text-foreground">
                {stats?.avg_duration_days != null ? `${stats.avg_duration_days} días` : '—'}
              </span>
            </div>
          </>
        )}
      </ChartCard>

      {/* Duración promedio por enfermedad */}
      <ChartCard
        icon={<Clock className="h-4 w-4" />}
        title="Duración promedio por enfermedad"
        subtitle="Casos cerrados: días desde el diagnóstico hasta el alta"
        className="lg:col-span-3"
      >
        {!hasData || durations.length === 0 ? (
          <EmptyChart message="Sin casos cerrados con alta registrada todavía; al cerrar un caso aparece aquí." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(150, durations.length * 44 + 30)}>
            <BarChart
              layout="vertical"
              data={durations}
              margin={{ top: 0, right: 24, left: 12, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="disease"
                width={140}
                tick={{ fontSize: 10 }}
              />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                formatter={(value: any, _name: any, props: any) => [
                  `${value} días (${props?.payload?.cases ?? 0} casos)`,
                  'Promedio',
                ]}
              />
              <Bar dataKey="avg_days" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
};
