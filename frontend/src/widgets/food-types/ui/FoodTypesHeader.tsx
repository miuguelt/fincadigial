import React, { useMemo } from 'react';
import {
  Wheat,
  Sprout,
  Layers,
  Sparkles,
  MapPin,
} from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { Badge } from '@/shared/ui/badge';
import { classifyFoodType } from '@/entities/food-type/model/forageClassification';
import type { FoodTypeResponse, FieldResponse } from '@/shared/api/generated/swaggerTypes';

interface FoodTypesHeaderProps {
  items: Array<FoodTypeResponse & { [k: string]: any }>;
  fields?: FieldResponse[];
}

export const FoodTypesHeader: React.FC<FoodTypesHeaderProps> = ({ items, fields = [] }) => {
  const metrics = useMemo(() => {
    const totalItems = items.length;
    let totalPastureArea = 0;
    let pastureCount = 0;
    let cutAndSilvoCount = 0;
    let supplementCount = 0;
    let silageCount = 0;

    const categoryBreakdown: Record<string, number> = {
      pasture: 0,
      cut_grass: 0,
      legume_silvopastoral: 0,
      silage_hay: 0,
      mineral_supplement: 0,
      concentrate: 0,
    };

    items.forEach((item) => {
      const area = Number(item.area) || 0;
      if (area > 0) {
        totalPastureArea += area;
      }

      const { category } = classifyFoodType(item.food_type || item.name, item.handlings || item.description);
      if (categoryBreakdown[category.id] !== undefined) {
        categoryBreakdown[category.id]++;
      }

      if (category.id === 'pasture') {
        pastureCount++;
      } else if (category.id === 'cut_grass' || category.id === 'legume_silvopastoral') {
        cutAndSilvoCount++;
      } else if (category.id === 'mineral_supplement' || category.id === 'concentrate') {
        supplementCount++;
      } else if (category.id === 'silage_hay') {
        silageCount++;
      }
    });

    const assignedFieldsCount = fields.filter((f) => Boolean(f.food_type_id)).length;
    const totalFields = fields.length;
    const pastureCoveragePct = totalFields > 0 ? Math.round((assignedFieldsCount / totalFields) * 100) : 0;

    return {
      totalItems,
      totalPastureArea,
      pastureCount,
      cutAndSilvoCount,
      supplementCount,
      silageCount,
      assignedFieldsCount,
      totalFields,
      pastureCoveragePct,
      categoryBreakdown,
    };
  }, [items, fields]);

  return (
    <DataScreenHeader
      icon={<Wheat className="h-5 w-5 text-white" />}
      iconClassName="from-emerald-600 to-teal-700 shadow-emerald-600/25"
      title={
        <>
          Alimentación y <span className="text-emerald-600 dark:text-emerald-400">Forrajes</span>
        </>
      }
      description="Catálogo agronómico, praderas, pastos de corte, bancos proteicos y nutrición bovina"
      actions={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold"
          >
            {metrics.totalItems} Recursos Registrados
          </Badge>
          {metrics.totalPastureArea > 0 && (
            <Badge
              variant="outline"
              className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 px-3 py-1 rounded-full text-xs font-bold"
            >
              {metrics.totalPastureArea.toLocaleString('es-CO')} ha Totales
            </Badge>
          )}
        </div>
      }
      metricsColumns={5}
      metrics={
        <>
          <KPICard
            compact
            title="Total Alimentos"
            value={metrics.totalItems}
            icon="🌾"
          />
          <KPICard
            compact
            title="Pasturas Pastoreo"
            value={`${metrics.pastureCount} tipos`}
            icon={<Sprout className="w-4 h-4 text-emerald-500" />}
          />
          <KPICard
            compact
            title="Bancos & Silvopastoril"
            value={`${metrics.cutAndSilvoCount} forrajes`}
            icon={<Layers className="w-4 h-4 text-teal-500" />}
          />
          <KPICard
            compact
            title="Sales & Concentrados"
            value={`${metrics.supplementCount} fórmulas`}
            icon={<Sparkles className="w-4 h-4 text-blue-500" />}
          />
          <KPICard
            compact
            title="Potreros Tipificados"
            value={
              metrics.totalFields > 0
                ? `${metrics.assignedFieldsCount} / ${metrics.totalFields} (${metrics.pastureCoveragePct}%)`
                : 'Sin potreros'
            }
            icon={<MapPin className="w-4 h-4 text-amber-500" />}
          />
        </>
      }
    />
  );
};
export default FoodTypesHeader;