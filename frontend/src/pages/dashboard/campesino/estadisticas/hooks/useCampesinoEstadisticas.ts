import { useMemo } from 'react';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';

export interface CampesinoKpiGauge {
  id: string;
  title: string;
  value: number | null;
  unit: string;
  status: 'optimal' | 'warning' | 'critical' | 'unavailable';
  statusLabel: string;
  statusColor: string;
  description: string;
  advice: string;
}

export interface CampesinoWeightStats {
  adgKg: number | null;
  adgGrams: number | null;
  adgStatus: 'fast' | 'moderate' | 'slow' | 'unavailable';
  adgStatusLabel: string;
  adgStatusColor: string;
  bestPerformer?: { record: string; dailyGainGrams: number };
  trends: Array<{ period: string; monthLabel: string; avgWeight: number; sampleSize: number }>;
}

export interface CampesinoFieldStats {
  totalFields: number;
  occupiedFields: number;
  restingFields: number;
  utilizationPercent: number | null;
  animalsPerField: number;
  status: 'plenty' | 'optimal' | 'overgrazing' | 'unavailable';
  statusLabel: string;
  statusColor: string;
  advice: string;
}

export interface CampesinoMilkStats {
  totalLiters: number;
  avgLitersPerCow: number | null;
  trend: 'up' | 'stable' | 'down' | 'unavailable';
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

const UNAVAILABLE_STATUS_COLOR = 'text-muted-foreground bg-muted/40 border-border';

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const deriveHealthGauge = (dashboard: any): CampesinoKpiGauge => {
  const rawIndex = finiteNumber(
    dashboard?.kpi_resumen?.cards?.find((card: any) => card.id === 'health_index')?.valor,
  );
  const active = finiteNumber(dashboard?.animales_activos?.valor);
  const sick = finiteNumber(dashboard?.animales_enfermos?.valor);
  const vacCoverage = finiteNumber(
    dashboard?.kpi_resumen?.cards?.find((card: any) => card.id === 'vaccination_coverage')?.valor,
  );
  const controlComp = finiteNumber(
    dashboard?.kpi_resumen?.cards?.find((card: any) => card.id === 'control_compliance')?.valor,
  );
  const index = active === 0 ? null : rawIndex;

  if (index === null) {
    return {
      id: 'health_gauge',
      title: 'Termómetro general del ganado',
      value: null,
      unit: '%',
      status: 'unavailable',
      statusLabel: 'Sin datos suficientes',
      statusColor: UNAVAILABLE_STATUS_COLOR,
      description: active === 0
        ? 'No hay animales vivos para calcular este indicador.'
        : 'Registra animales y controles sanitarios para calcular este indicador.',
      advice: 'Registra el inventario y un control sanitario para comenzar a medir la finca.',
    };
  }

  let status: 'optimal' | 'warning' | 'critical' = 'optimal';
  let statusLabel = 'Ganado en buen estado (óptimo)';
  let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800';
  let advice = 'El ganado está en excelentes condiciones sanitarias y con controles al día.';

  if (index < 65 || (sick !== null && sick > 3)) {
    status = 'critical';
    statusLabel = 'Alerta Sanitaria';
    statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800';
    advice = 'Hay animales enfermos o atraso severo en planes de vacunación. Revise la enfermería.';
  } else if (index < 85 || (vacCoverage !== null && vacCoverage < 80) || (controlComp !== null && controlComp < 75)) {
    status = 'warning';
    statusLabel = 'Atención Requerida';
    statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800';
    advice = 'Tiene lotes pendientes por vacunar o pesar. Programe jornada de corral.';
  }

  return {
    id: 'health_gauge',
    title: 'Termómetro general del ganado',
    value: Math.round(index),
    unit: '%',
    status,
    statusLabel,
    statusColor,
    description: active !== null
      ? `Índice de salud y cuidado calculado sobre ${active} animales vivos.`
      : 'Índice de salud calculado con los registros sanitarios disponibles.',
    advice,
  };
};

export const deriveWeightStats = (prodStats: any): CampesinoWeightStats => {
  const adgKg = finiteNumber(prodStats?.productivity_metrics?.average_daily_gain_kg);
  const adgGrams = adgKg === null ? null : Math.round(adgKg * 1000);

  let adgStatus: CampesinoWeightStats['adgStatus'] = 'unavailable';
  let adgStatusLabel = 'Sin datos de pesaje';
  let adgStatusColor = UNAVAILABLE_STATUS_COLOR;
  if (adgGrams !== null) {
    adgStatus = 'moderate';
    adgStatusLabel = 'Engorde Moderado (350 - 600 g/día)';
    adgStatusColor = 'text-amber-600 dark:text-amber-400';
    if (adgGrams >= 600) {
      adgStatus = 'fast';
      adgStatusLabel = 'Excelente Ganancia (+600 g/día)';
      adgStatusColor = 'text-emerald-600 dark:text-emerald-400';
    } else if (adgGrams < 350) {
      adgStatus = 'slow';
      adgStatusLabel = 'Ganancia Lenta / Estancado (<350 g/día)';
      adgStatusColor = 'text-rose-600 dark:text-rose-400';
    }
  }

  const rawBest = prodStats?.best_performers?.[0];
  const bestGain = finiteNumber(rawBest?.daily_gain);
  const bestPerformer = rawBest && bestGain !== null
    ? {
        record: rawBest.record || `Animal ${rawBest.animal_id}`,
        dailyGainGrams: Math.round(bestGain * 1000),
      }
    : undefined;

  const trends = (Array.isArray(prodStats?.weight_trends) ? prodStats.weight_trends : [])
    .slice(-6)
    .map((trend: any) => {
      const avgWeight = finiteNumber(trend?.avg_weight);
      const month = finiteNumber(trend?.month);
      if (avgWeight === null || month === null) return null;
      const monthLabel = MONTH_NAMES[month - 1] || `M${month}`;
      return {
        period: trend.period || `${trend.year}-${trend.month}`,
        monthLabel: `${monthLabel} ${String(trend.year).slice(-2)}`,
        avgWeight: Math.round(avgWeight),
        sampleSize: finiteNumber(trend.sample_size) ?? 0,
      };
    })
    .filter(Boolean) as CampesinoWeightStats['trends'];

  return { adgKg, adgGrams, adgStatus, adgStatusLabel, adgStatusColor, bestPerformer, trends };
};

export const deriveFieldStats = (prodStats: any): CampesinoFieldStats => {
  const totalFields = finiteNumber(prodStats?.field_metrics?.total_fields) ?? 0;
  const occupiedFields = finiteNumber(prodStats?.field_metrics?.occupied_fields) ?? 0;
  const restingFields = Math.max(0, totalFields - occupiedFields);
  const rawUtil = finiteNumber(prodStats?.field_metrics?.utilization_percent);
  const utilizationPercent = totalFields > 0 ? rawUtil : null;
  const animalsPerField = finiteNumber(prodStats?.field_metrics?.animals_per_field) ?? 0;

  if (utilizationPercent === null) {
    return {
      totalFields,
      occupiedFields,
      restingFields,
      utilizationPercent: null,
      animalsPerField,
      status: 'unavailable',
      statusLabel: 'Sin datos de aforo',
      statusColor: UNAVAILABLE_STATUS_COLOR,
      advice: 'Registra potreros y un aforo para conocer la carga y planear la rotación.',
    };
  }

  let status: CampesinoFieldStats['status'] = 'optimal';
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

  return { totalFields, occupiedFields, restingFields, utilizationPercent, animalsPerField, status, statusLabel, statusColor, advice };
};

export const deriveMilkStats = (dashboard: any): CampesinoMilkStats => {
  const totalRaw = finiteNumber(dashboard?.produccion_leche_total?.valor ?? dashboard?.produccion_leche?.valor);
  const avgRaw = finiteNumber(dashboard?.promedio_leche?.valor);
  const totalLiters = Math.round(totalRaw ?? 0);
  const avgLitersPerCow = avgRaw !== null && avgRaw > 0 ? Number(avgRaw.toFixed(1)) : null;

  if (avgLitersPerCow === null) {
    return {
      totalLiters,
      avgLitersPerCow: null,
      trend: 'unavailable',
      trendLabel: 'Sin datos de ordeño',
      advice: 'Registra ordeños para conocer el promedio y su evolución.',
    };
  }

  let trend: CampesinoMilkStats['trend'] = 'stable';
  let trendLabel = 'Producción Estable';
  let advice = 'El rendimiento del ordeño se mantiene dentro del promedio habitual.';
  if (avgLitersPerCow >= 8) {
    trend = 'up';
    trendLabel = 'Buen Ritmo Lechero';
    advice = 'Buen rendimiento por vaca. Mantenga la sal mineralizada y el buen pasto.';
  } else if (avgLitersPerCow < 4) {
    trend = 'down';
    trendLabel = 'Bajón en el Balde';
    advice = 'Promedio bajo de leche. Verifique si hay vacas en celo, cambio de pasto o agua sucia.';
  }
  return { totalLiters, avgLitersPerCow, trend, trendLabel, advice };
};

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

  // 1. Termómetro integral del ganado (Health & Operational Index)
  const healthGauge = useMemo(() => deriveHealthGauge(dashboard), [dashboard]);

  // 2. Oscilador de Ganancia de Peso (ADG)
  const weightStats = useMemo(() => deriveWeightStats(prodStats), [prodStats]);

  // 3. Oscilador de Potreros y Carga
  const fieldStats = useMemo(() => deriveFieldStats(prodStats), [prodStats]);

  // 4. Oscilador de Leche y Ordeño
  const milkStats = useMemo(() => deriveMilkStats(dashboard), [dashboard]);

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
