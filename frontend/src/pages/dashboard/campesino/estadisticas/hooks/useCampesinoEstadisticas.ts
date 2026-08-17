import { useMemo } from 'react';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';

export interface CampesinoKpiGauge {
  id: string;
  title: string;
  value: number;
  unit: string;
  status: 'optimal' | 'warning' | 'critical';
  statusLabel: string;
  statusColor: string;
  description: string;
  advice: string;
}

export interface CampesinoWeightStats {
  adgKg: number;
  adgGrams: number;
  adgStatus: 'fast' | 'moderate' | 'slow';
  adgStatusLabel: string;
  adgStatusColor: string;
  bestPerformer?: { record: string; dailyGainGrams: number };
  trends: Array<{ period: string; monthLabel: string; avgWeight: number; sampleSize: number }>;
}

export interface CampesinoFieldStats {
  totalFields: number;
  occupiedFields: number;
  restingFields: number;
  utilizationPercent: number;
  animalsPerField: number;
  status: 'plenty' | 'optimal' | 'overgrazing';
  statusLabel: string;
  statusColor: string;
  advice: string;
}

export interface CampesinoMilkStats {
  totalLiters: number;
  avgLitersPerCow: number;
  trend: 'up' | 'stable' | 'down';
  trendLabel: string;
  advice: string;
}

export interface CampesinoDemographics {
  totalAlive: number;
  males: number;
  females: number;
  calves: number; // 0-1 año (Terneros)
  young: number;  // 1-2 años (Levante / Jóvenes)
  adults: number; // 2-5 años (Ceba / Vientres)
  mature: number; // 5+ años (Vacas / Toros adultos)
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const useCampesinoEstadisticas = () => {
  const {
    useDashboard,
    useAnimalStatistics,
    useProductionStatistics,
    useHealthStatistics,
  } = useAnalytics();

  const { data: dashboard, isLoading: loadingDash, refetch: refetchDash } = useDashboard();
  const { data: animalStats, isLoading: loadingAnimals, refetch: refetchAnimals } = useAnimalStatistics();
  const { data: prodStats, isLoading: loadingProd, refetch: refetchProd } = useProductionStatistics();
  const { data: healthStats, isLoading: loadingHealth, refetch: refetchHealth } = useHealthStatistics();

  const isLoading = loadingDash || loadingAnimals || loadingProd || loadingHealth;

  const refetchAll = async () => {
    await Promise.all([
      refetchDash(),
      refetchAnimals(),
      refetchProd(),
      refetchHealth(),
    ]);
  };

  // 1. Termómetro Integral del Hato (Health & Operational Index)
  const healthGauge = useMemo<CampesinoKpiGauge>(() => {
    const rawIndex = dashboard?.kpi_resumen?.cards?.find((c: any) => c.id === 'health_index')?.valor;
    const active = dashboard?.animales_activos?.valor ?? 0;
    const sick = dashboard?.animales_enfermos?.valor ?? 0;
    const vacCoverage = dashboard?.kpi_resumen?.cards?.find((c: any) => c.id === 'vaccination_coverage')?.valor ?? 100;
    const controlComp = dashboard?.kpi_resumen?.cards?.find((c: any) => c.id === 'control_compliance')?.valor ?? 100;

    let index = typeof rawIndex === 'number' ? rawIndex : 100;
    if (active === 0) index = 100;

    let status: 'optimal' | 'warning' | 'critical' = 'optimal';
    let statusLabel = 'Hato al Pelo (Óptimo)';
    let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800';
    let advice = 'El ganado está en excelentes condiciones sanitarias y con controles al día.';

    if (index < 65 || sick > 3) {
      status = 'critical';
      statusLabel = 'Alerta Sanitaria';
      statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800';
      advice = 'Hay animales enfermos o atraso severo en planes de vacunación. Revise la enfermería.';
    } else if (index < 85 || vacCoverage < 80 || controlComp < 75) {
      status = 'warning';
      statusLabel = 'Atención Requerida';
      statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800';
      advice = 'Tiene lotes pendientes por vacunar o pesar. Programe jornada de corral.';
    }

    return {
      id: 'health_gauge',
      title: 'Termómetro General del Hato',
      value: Math.round(index),
      unit: '%',
      status,
      statusLabel,
      statusColor,
      description: `Índice de salud y cuidado calculado sobre ${active} animales vivos.`,
      advice,
    };
  }, [dashboard]);

  // 2. Oscilador de Ganancia de Peso (ADG)
  const weightStats = useMemo<CampesinoWeightStats>(() => {
    const rawAdg = prodStats?.productivity_metrics?.average_daily_gain_kg;
    const adgKg = typeof rawAdg === 'number' ? rawAdg : 0.55;
    const adgGrams = Math.round(adgKg * 1000);

    let adgStatus: 'fast' | 'moderate' | 'slow' = 'moderate';
    let adgStatusLabel = 'Engorde Moderado (350 - 600 g/día)';
    let adgStatusColor = 'text-amber-600 dark:text-amber-400';

    if (adgGrams >= 600) {
      adgStatus = 'fast';
      adgStatusLabel = 'Excelente Ganancia (+600 g/día)';
      adgStatusColor = 'text-emerald-600 dark:text-emerald-400';
    } else if (adgGrams < 350) {
      adgStatus = 'slow';
      adgStatusLabel = 'Ganancia Lenta / Estancado (<350 g/día)';
      adgStatusColor = 'text-rose-600 dark:text-rose-400';
    }

    const rawBest = prodStats?.best_performers?.[0];
    const bestPerformer = rawBest
      ? {
          record: rawBest.record || `Animal ${rawBest.animal_id}`,
          dailyGainGrams: Math.round((rawBest.daily_gain || 0) * 1000),
        }
      : undefined;

    const rawTrends = prodStats?.weight_trends || [];
    const trends = rawTrends.slice(-6).map((t: any) => {
      const monthIdx = (t.month || 1) - 1;
      const monthLabel = MONTH_NAMES[monthIdx] || `M${t.month}`;
      return {
        period: t.period || `${t.year}-${t.month}`,
        monthLabel: `${monthLabel} ${String(t.year).slice(-2)}`,
        avgWeight: Math.round(t.avg_weight || 0),
        sampleSize: t.sample_size || 0,
      };
    });

    return {
      adgKg,
      adgGrams,
      adgStatus,
      adgStatusLabel,
      adgStatusColor,
      bestPerformer,
      trends,
    };
  }, [prodStats]);

  // 3. Oscilador de Potreros y Carga
  const fieldStats = useMemo<CampesinoFieldStats>(() => {
    const rawUtil = prodStats?.field_metrics?.utilization_percent;
    const totalFields = prodStats?.field_metrics?.total_fields || 0;
    const occupiedFields = prodStats?.field_metrics?.occupied_fields || 0;
    const restingFields = Math.max(0, totalFields - occupiedFields);
    const utilizationPercent = typeof rawUtil === 'number' ? rawUtil : 65;
    const animalsPerField = prodStats?.field_metrics?.animals_per_field || 0;

    let status: 'plenty' | 'optimal' | 'overgrazing' = 'optimal';
    let statusLabel = 'Pastoreo Equilibrado (50% - 85%)';
    let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800';
    let advice = 'La carga animal está bien repartida y los potreros tienen buen tiempo de descanso.';

    if (utilizationPercent > 85) {
      status = 'overgrazing';
      statusLabel = 'Riesgo de Sobrepastoreo (>85%)';
      statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800';
      advice = 'Mucho ganado para el pasto disponible. Rote los lotes pronto para no pelar el potrero.';
    } else if (utilizationPercent < 50) {
      status = 'plenty';
      statusLabel = 'Pasto Sobrante / Subutilizado (<50%)';
      statusColor = 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800';
      advice = 'Hay potreros descansados con pasto tierno listo para recibir ganado.';
    }

    return {
      totalFields,
      occupiedFields,
      restingFields,
      utilizationPercent,
      animalsPerField,
      status,
      statusLabel,
      statusColor,
      advice,
    };
  }, [prodStats]);

  // 4. Oscilador de Leche y Ordeño
  const milkStats = useMemo<CampesinoMilkStats>(() => {
    const totalLiters = dashboard?.produccion_leche_total?.valor || dashboard?.produccion_leche?.valor || 0;
    const avgLiters = dashboard?.promedio_leche?.valor || 0;

    // Supongamos umbrales típicos de trópico bajo/medio (6-12L)
    let trend: 'up' | 'stable' | 'down' = 'stable';
    let trendLabel = 'Producción Estable';
    let advice = 'El rendimiento del ordeño se mantiene dentro del promedio habitual.';

    if (avgLiters >= 8) {
      trend = 'up';
      trendLabel = 'Buen Ritmo Lechero';
      advice = 'Buen rendimiento por vaca. Mantenga la sal mineralizada y el buen pasto.';
    } else if (avgLiters > 0 && avgLiters < 4) {
      trend = 'down';
      trendLabel = 'Bajón en el Balde';
      advice = 'Promedio bajo de leche. Verifique si hay vacas en celo, cambio de pasto o agua sucia.';
    }

    return {
      totalLiters: Math.round(totalLiters),
      avgLitersPerCow: Number(avgLiters.toFixed(1)),
      trend,
      trendLabel,
      advice,
    };
  }, [dashboard]);

  // 5. Demografía Campesina
  const demographics = useMemo<CampesinoDemographics>(() => {
    const totalAlive = dashboard?.animales_activos?.valor || (animalStats as any)?.total_animals || 0;
    const sexActive = (animalStats as any)?.by_sex_active || (animalStats as any)?.by_sex || {};
    const males = sexActive.Macho || sexActive.macho || 0;
    const females = sexActive.Hembra || sexActive.hembra || 0;

    const ageGroup = (animalStats as any)?.by_age_group || {};
    const calves = ageGroup['Terneros (0-1 año)'] || 0;
    const young = ageGroup['Jóvenes (1-2 años)'] || 0;
    const adults = ageGroup['Adultos (2-5 años)'] || 0;
    const mature = ageGroup['Maduros (5+ años)'] || 0;

    return {
      totalAlive,
      males,
      females,
      calves,
      young,
      adults,
      mature,
    };
  }, [animalStats, dashboard]);

  return {
    isLoading,
    refetchAll,
    healthGauge,
    weightStats,
    fieldStats,
    milkStats,
    demographics,
    rawDashboard: dashboard,
    rawAnimalStats: animalStats,
    rawProdStats: prodStats,
    rawHealthStats: healthStats,
  };
};
