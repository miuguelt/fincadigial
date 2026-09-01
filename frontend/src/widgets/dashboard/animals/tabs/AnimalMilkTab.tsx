import React, { useMemo } from 'react';
import {
  Milk,
  DollarSign,
  Droplets,
  Award,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Badge } from '@/shared/ui/badge';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MilkRecord {
  id?: number;
  date: string;
  liters: number;
  milking_session?: 'AM' | 'PM' | 'Extra';
  fat_percentage?: number;
  protein_percentage?: number;
  somatic_cells?: number;
  notes?: string;
}

interface AnimalMilkTabProps {
  animal: any;
  milkRecords?: MilkRecord[];
  formatDate: (dateStr: string) => string;
}

export const AnimalMilkTab: React.FC<AnimalMilkTabProps> = ({
  animal,
  milkRecords = [],
  formatDate,
}) => {
  const isFemale = (animal.sex || animal.gender) === 'Hembra';

  // Ordenar registros por fecha
  const sortedRecords = useMemo(() => {
    return [...milkRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [milkRecords]);

  // Cálculos de Producción y Rendimiento Lechero
  const milkKpis = useMemo(() => {
    if (sortedRecords.length === 0) {
      return {
        totalLiters: 0,
        avgDailyLiters: 0,
        peakLiters: 0,
        daysInMilk: 0,
        avgFat: null,
        avgProtein: null,
        avgSomaticCells: null,
        estimatedRevenue: 0,
      };
    }

    const totalLiters = sortedRecords.reduce((acc, r) => acc + (Number(r.liters) || 0), 0);
    const peakLiters = Math.max(...sortedRecords.map((r) => Number(r.liters) || 0));

    // Días únicos de ordeño
    const uniqueDays = new Set(sortedRecords.map((r) => r.date.split('T')[0]));
    const daysInMilk = uniqueDays.size;
    const avgDailyLiters = daysInMilk > 0 ? (totalLiters / daysInMilk).toFixed(1) : 0;

    // Calidad composicional
    const fatRecords = sortedRecords.filter((r) => r.fat_percentage && r.fat_percentage > 0);
    const avgFat =
      fatRecords.length > 0
        ? (
            fatRecords.reduce((acc, r) => acc + Number(r.fat_percentage), 0) / fatRecords.length
          ).toFixed(2)
        : null;

    const proteinRecords = sortedRecords.filter((r) => r.protein_percentage && r.protein_percentage > 0);
    const avgProtein =
      proteinRecords.length > 0
        ? (
            proteinRecords.reduce((acc, r) => acc + Number(r.protein_percentage), 0) /
            proteinRecords.length
          ).toFixed(2)
        : null;

    const somaticRecords = sortedRecords.filter((r) => r.somatic_cells && r.somatic_cells > 0);
    const avgSomaticCells =
      somaticRecords.length > 0
        ? Math.round(
            somaticRecords.reduce((acc, r) => acc + Number(r.somatic_cells), 0) /
              somaticRecords.length
          )
        : null;

    // Precio referencial de leche cruda Colombia (~$2.150 COP / litro)
    const MILK_PRICE_PER_LITER = 2150;
    const estimatedRevenue = Math.round(totalLiters * MILK_PRICE_PER_LITER);

    return {
      totalLiters: totalLiters.toFixed(1),
      avgDailyLiters,
      peakLiters: peakLiters.toFixed(1),
      daysInMilk,
      avgFat,
      avgProtein,
      avgSomaticCells,
      estimatedRevenue,
    };
  }, [sortedRecords]);

  // Datos para el gráfico de Curva de Lactancia
  const chartData = useMemo(() => {
    if (sortedRecords.length === 0) return null;

    const dailyMap = new Map<string, { am: number; pm: number; total: number }>();
    sortedRecords.forEach((r) => {
      const dStr = r.date.split('T')[0];
      const current = dailyMap.get(dStr) || { am: 0, pm: 0, total: 0 };
      const liters = Number(r.liters) || 0;
      if (r.milking_session === 'AM') current.am += liters;
      else if (r.milking_session === 'PM') current.pm += liters;
      else current.total += liters;
      current.total = current.am + current.pm + (r.milking_session === 'Extra' ? liters : 0);
      dailyMap.set(dStr, current);
    });

    const labels = Array.from(dailyMap.keys()).map((dStr) => {
      const d = new Date(dStr);
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    });

    const totals = Array.from(dailyMap.values()).map((v) => v.total);
    const ams = Array.from(dailyMap.values()).map((v) => (v.am > 0 ? v.am : null));
    const pms = Array.from(dailyMap.values()).map((v) => (v.pm > 0 ? v.pm : null));

    return {
      labels,
      datasets: [
        {
          label: 'Total Diario (L)',
          data: totals,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
        },
        {
          label: 'Ordeño AM (L)',
          data: ams,
          borderColor: '#0284c7',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.35,
        },
        {
          label: 'Ordeño PM (L)',
          data: pms,
          borderColor: '#7c3aed',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.35,
        },
      ],
    };
  }, [sortedRecords]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          font: { size: 11, weight: 'bold' as const },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        title: { display: true, text: 'Litros (L)', font: { size: 10 } },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  if (!isFemale && sortedRecords.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 p-8 text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
          <Milk className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Registro Lechero No Aplicable</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Este animal está registrado como Macho ({animal.record || `#${animal.id}`}). El módulo de
          producción lechera aplica para vacas y novillas en ordeño.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 4 KPIs de Rendimiento Lechero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span>Promedio Diario</span>
            <Milk className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {milkKpis.avgDailyLiters} <span className="text-xs font-semibold text-muted-foreground">L/día</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {milkKpis.daysInMilk} días de ordeño evaluados
          </p>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 dark:bg-cyan-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
            <span>Producción Acumulada</span>
            <Droplets className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {milkKpis.totalLiters} <span className="text-xs font-semibold text-muted-foreground">Litros</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Total producido en la lactancia</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <span>Pico de Producción</span>
            <Award className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {milkKpis.peakLiters} <span className="text-xs font-semibold text-muted-foreground">L/jornada</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Máximo registrado en un día</p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>Ingresos Estimados</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            ${milkKpis.estimatedRevenue.toLocaleString('es-CO')}
          </div>
          <p className="text-[11px] text-muted-foreground">Valoración ~$2.150 COP / Litro</p>
        </div>
      </div>

      {/* Tarjetas de Calidad Composicional de Leche */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Grasa Butírica</span>
            <p className="text-lg font-black text-foreground mt-0.5">
              {milkKpis.avgFat !== null ? `${milkKpis.avgFat}%` : '3.8% (Est.)'}
            </p>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px]">
            Calidad A
          </Badge>
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Proteína Láctea</span>
            <p className="text-lg font-black text-foreground mt-0.5">
              {milkKpis.avgProtein !== null ? `${milkKpis.avgProtein}%` : '3.2% (Est.)'}
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[11px]">
            Estándar
          </Badge>
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Células Somáticas (RCS)</span>
            <p className="text-lg font-black text-foreground mt-0.5">
              {milkKpis.avgSomaticCells !== null
                ? `${milkKpis.avgSomaticCells.toLocaleString('es-CO')} cel/ml`
                : '< 200.000'}
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px]">
            Saludable
          </Badge>
        </div>
      </div>

      {/* Curva de Lactancia */}
      <CollapsibleCard
        title="Curva de Lactancia y Evolución de Ordeños"
        accent="blue"
        defaultCollapsed={false}
      >
        <div className="p-2">
          {chartData ? (
            <div className="h-56">
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-xs italic">
              No hay suficientes registros de pesaje de leche para graficar la curva de lactancia.
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Historial de Ordeños */}
      <CollapsibleCard
        title={`Historial de Registros de Ordeño (${sortedRecords.length})`}
        accent="slate"
        defaultCollapsed={true}
      >
        {sortedRecords.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs italic">
            No hay registros de ordeño individuales para este animal.
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {sortedRecords.map((r, idx) => (
              <div
                key={r.id || idx}
                className="p-2.5 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-bold">
                    {formatDate(r.date)}
                  </Badge>
                  <span className="font-semibold text-muted-foreground">
                    Sesión: <span className="text-foreground font-bold">{r.milking_session || 'Día'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-foreground tabular-nums">
                    {r.liters} L
                  </span>
                  {r.fat_percentage && (
                    <span className="text-[11px] text-muted-foreground">Grasa: {r.fat_percentage}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>
    </div>
  );
};
