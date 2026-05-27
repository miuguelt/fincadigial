import React, { useMemo } from 'react';
import { PawPrint, Activity, AlertTriangle } from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';

interface PremiumAnimalsHeaderProps {
  items: Array<AnimalResponse & { [k: string]: any }>;
  alertCountMap: Record<number, number>;
}

export const PremiumAnimalsHeader: React.FC<PremiumAnimalsHeaderProps> = ({ items, alertCountMap }) => {
  const metrics = useMemo(() => {
    let totalAnimals = 0;
    let totalMales = 0;
    let totalFemales = 0;
    let totalAlerts = 0;
    let totalVivos = 0;
    let totalVendidosMuertos = 0;

    items.forEach(animal => {
      totalAnimals++;
      
      const gender = (animal.sex || animal.gender || '').toLowerCase();
      if (gender === 'macho' || gender === 'm') totalMales++;
      if (gender === 'hembra' || gender === 'f') totalFemales++;

      const status = (animal.status || animal.estado || '').toLowerCase();
      if (status === 'vivo' || status === 'activo') {
        totalVivos++;
      } else if (status === 'vendido' || status === 'muerto') {
        totalVendidosMuertos++;
      }

      // Sumar alertas asociadas a los animales filtrados
      if (animal.id && alertCountMap[Number(animal.id)]) {
        totalAlerts += alertCountMap[Number(animal.id)];
      }
    });

    const percentMales = totalAnimals > 0 ? Math.round((totalMales / totalAnimals) * 100) : 0;
    const percentFemales = totalAnimals > 0 ? Math.round((totalFemales / totalAnimals) * 100) : 0;

    return {
      totalAnimals,
      totalMales,
      totalFemales,
      percentMales,
      percentFemales,
      totalAlerts,
      totalVivos,
      totalVendidosMuertos
    };
  }, [items, alertCountMap]);

  return (
    <div className="mb-6 space-y-6">
      {/* Header Premium */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-card/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
            <PawPrint className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Gestión de <span className="text-indigo-500">Animales</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">Control de inventario, genética y métricas en tiempo real (Offline-Ready)</p>
          </div>
        </div>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KPICard title="Total Animales" value={metrics.totalAnimals} icon="🐄" />
        <KPICard 
          title="Distribución (M/H)" 
          value={`${metrics.percentMales}% / ${metrics.percentFemales}%`} 
          icon="⚖️" 
        />
        <KPICard 
          title="Animales Activos" 
          value={metrics.totalVivos} 
          icon={<Activity className="w-5 h-5" />} 
        />
        <KPICard 
          title="Alertas Pendientes" 
          value={metrics.totalAlerts} 
          icon={<AlertTriangle className={metrics.totalAlerts > 0 ? "text-amber-500" : "text-emerald-500"} />} 
        />
      </div>
    </div>
  );
};
