import React, { useMemo } from 'react';
import { PawPrint, Activity, AlertTriangle } from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';

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
    <DataScreenHeader
      icon={<PawPrint className="h-5 w-5 text-white" />}
      iconClassName="from-indigo-500 to-indigo-600 shadow-indigo-500/20"
      title={<>Gestión de <span className="text-indigo-500">Animales</span></>}
      description="Control de inventario, genética y métricas en tiempo real (Offline-Ready)"
      metrics={
        <>
          <KPICard compact title="Total Animales" value={metrics.totalAnimals} icon="🐄" />
          <KPICard
            compact
            title="Distribución (M/H)"
            value={`${metrics.percentMales}% / ${metrics.percentFemales}%`}
            icon="⚖️"
          />
          <KPICard
            compact
            title="Animales Activos"
            value={metrics.totalVivos}
            icon={<Activity className="w-4 h-4" />}
          />
          <KPICard
            compact
            title="Alertas Pendientes"
            value={metrics.totalAlerts}
            icon={<AlertTriangle className={`w-4 h-4 ${metrics.totalAlerts > 0 ? "text-amber-500" : "text-emerald-500"}`} />}
          />
        </>
      }
    />
  );
};
