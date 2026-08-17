import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { COLORS, getChartColors } from '@/shared/utils/colors';
import { getBreedLabel } from './analyticsAdapters';

interface ExecutiveDemographicsProps {
  totalesSexo: { machos: number; hembras: number };
  statusChartData: any;
  ageDistributionData: any;
  topBreeds: any[];
  totalAnimales: number;
  loading: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/50 p-3 rounded-xl shadow-xl backdrop-blur-xl">
        <p className="text-sm font-bold text-foreground">{payload[0].name || payload[0].payload.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          <span className="font-semibold text-primary">{payload[0].value}</span> animales
        </p>
      </div>
    );
  }
  return null;
};

export const ExecutiveDemographics: React.FC<ExecutiveDemographicsProps> = ({
  totalesSexo,
  statusChartData,
  ageDistributionData,
  topBreeds,
  totalAnimales,
  loading
}) => {
  const pieData = [
    { name: 'Machos', value: totalesSexo.machos, color: COLORS.animals.male },
    { name: 'Hembras', value: totalesSexo.hembras, color: COLORS.animals.female },
  ];

  const statusData = statusChartData?.labels?.map((label: string, index: number) => ({
    name: label,
    value: statusChartData.datasets[0].data[index],
  })) || [];

  const ageData = ageDistributionData?.labels?.map((label: string, index: number) => ({
    name: label,
    value: ageDistributionData.datasets[0].data[index],
  })) || [];

  const statusColors = getChartColors(statusData.length);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Distribución por sexo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Distribución por sexo</h2>
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Valor central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-foreground">{totalAnimales}</span>
            <span className="text-xs font-semibold text-muted-foreground">Total</span>
          </div>
        </div>
      </motion.div>

      {/* Estado de los animales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Estado actual</h2>
        <div className="h-64">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm animate-pulse">Cargando...</div>
          ) : statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.4)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos</div>
          )}
        </div>
      </motion.div>

      {/* Pirámide de Edades / Razas Destacadas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col gap-6"
      >
        <div className="flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Edades</h2>
          <div className="h-24">
            {loading ? (
              <div className="animate-pulse h-full bg-muted/50 rounded-xl"></div>
            ) : ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={ageData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                  <Bar dataKey="value" fill={COLORS.charts.secondary} radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Sin datos</div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Top Razas</h2>
          {topBreeds && topBreeds.length > 0 ? (
            <div className="space-y-3">
              {topBreeds.slice(0, 3).map((breed: any, index: number) => {
                const nombre = getBreedLabel(breed, index);
                const cantidad = breed.count ?? breed.cantidad ?? 0;
                const porcentaje = totalAnimales > 0 ? ((cantidad / totalAnimales) * 100).toFixed(1) : "0";
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                      <span className="fit-clamp max-w-[70%]">{nombre}</span>
                      <span>{cantidad}</span>
                    </div>
                    <div className="w-full bg-muted/50 rounded-full h-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(Number(porcentaje), 100)}%` }}
                        transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                        className="h-1.5 rounded-full bg-primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin datos</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
