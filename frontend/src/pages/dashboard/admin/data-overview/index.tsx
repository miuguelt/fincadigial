import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Milk,
  Activity,
  DollarSign,
  Package,
  Users,
  Bell,
  Radar,
  ScatterChart,
  Flame,
  CheckCircle2,
  Database
} from 'lucide-react';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { useMilkProduction } from '@/entities/milk/hooks';
import { useFinancial } from '@/entities/financial/hooks';
import { useReproductionStats } from '@/entities/reproduction/hooks';
import { inventoryService } from '@/entities/inventory/api';
import { reproductionService } from '@/entities/reproduction/api';
import {
  MilkProductionChart,
  FinancialChart,
  ReproductionChart,
  AnimalMetricsRadar,
  WeightAgeScatter,
  ActivityHeatmap
} from '@/shared/components/charts';
import { useAnimals } from '@/entities/animal/model/useAnimals';
import { useAuth } from '@/features/auth/model/useAuth';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import { DatabaseSchemaExplorer } from '@/features/data-overview/ui/DatabaseSchemaExplorer';
import { isTodayColombia } from '@/shared/utils/dateUtils';


// Tipos para datos adicionales
interface DashboardStats {
  milkProduction: {
    totalRecords: number;
    totalLiters: number;
    todayLiters: number;
  };
  financial: {
    totalTransactions: number;
    balance: number;
    income: number;
    expenses: number;
  };
  reproduction: {
    totalEvents: number;
    activePregnancies: number;
    pendingBirths: number;
    conceptionRate: number | null;
  };
  inventory: {
    totalMovements: number;
    lowStockItems: number;
    expiringItems: number;
  };
}

export default function DataOverviewDashboard() {
  const { user } = useAuth();
  const fincaId = user?.finca_id;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook para estadísticas consolidadas reales desde el backend
  const { useDashboard } = useAnalytics();
  const { data: dashboardData, isLoading: dashboardStatsLoading } = useDashboard();

  // Hooks para datos principales
  const {
    productions,
    summary: milkSummary,
    loading: milkLoading
  } = useMilkProduction({ fincaId, autoFetch: true });


  const {
    transactions,
    summary: financialSummary,
    balance,
    loading: financialLoading
  } = useFinancial({ fincaId, autoFetch: true });

  const {
    summary: reproSummary,
    pendingBirths,
    loading: reproLoading
  } = useReproductionStats({ fincaId, autoFetch: true });

  // Hook para datos de animales (para gráficos avanzados)
  const {
    animals,
    loading: animalsLoading,
  } = useAnimals({ autoFetch: true });

  useEffect(() => {
    const fetchAdditionalStats = async () => {
      try {
        // Obtener datos adicionales desde APIs
        const [inventorySummary, _offspring] = await Promise.all([
          inventoryService.getSummary(),
          reproductionService.getOffspring(),
        ]);

        setStats({
          milkProduction: {
            totalRecords: productions.length,
            totalLiters: milkSummary?.totalLiters || 0,
            todayLiters: productions
              .filter(p => p.date && isTodayColombia(p.date))
              .reduce((sum, p) => sum + p.liters, 0),
          },
          financial: {
            totalTransactions: transactions.length,
            balance: balance,
            income: financialSummary?.total_income || 0,
            expenses: financialSummary?.total_expense || 0,
          },
          reproduction: {
            totalEvents: reproSummary?.total_events || 0,
            activePregnancies: reproSummary?.active_pregnancies || 0,
            pendingBirths: pendingBirths.length,
            conceptionRate: reproSummary?.conception_rate_pct ?? null,
          },
          inventory: {
            totalMovements: inventorySummary?.recent_movements?.length || 0,
            lowStockItems: inventorySummary?.low_stock_lots || 0,
            expiringItems: inventorySummary?.expiring_soon_lots || 0,
          },
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!milkLoading && !financialLoading && !reproLoading) {
      fetchAdditionalStats();
    }
  }, [productions, transactions, milkLoading, financialLoading, reproLoading, balance, milkSummary, financialSummary, reproSummary, pendingBirths]);

  const isLoading = milkLoading || financialLoading || reproLoading || animalsLoading || loading;

  return (
    <div className="min-h-full space-y-6 overflow-x-hidden p-4 sm:p-6 lg:p-8 animate-fade-in">
      <DataScreenHeader
        icon={<Database className="h-5 w-5 text-white" />}
        iconClassName="from-emerald-600 to-teal-700 shadow-emerald-600/20"
        title={<>Vista General de <span className="text-primary">Datos</span></>}
        description="Resumen global de los registros y telemetría de la finca activa"
        actions={
          <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-card/60">
            Finca activa: {fincaId ?? '—'}
          </Badge>
        }
      />

      {/* Sección: Producción Láctea */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Milk className="h-5 w-5 text-info" />
          Producción Láctea
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Registros"
            value={stats?.milkProduction.totalRecords || 0}
            description="Registros de producción"
            loading={isLoading}
          />
          <StatCard
            title="Litros Totales"
            value={`${(stats?.milkProduction.totalLiters || 0).toFixed(1)} L`}
            description="Producción acumulada"
            loading={isLoading}
          />
          <StatCard
            title="Hoy"
            value={`${(stats?.milkProduction.todayLiters || 0).toFixed(1)} L`}
            description="Producción del día"
            loading={isLoading}
          />
          <StatCard
            title="Promedio/Día"
            value={`${((stats?.milkProduction.totalLiters || 0) / 7).toFixed(1)} L`}
            description="Promedio últimos 7 días"
            loading={isLoading}
          />
        </div>

        {/* Gráfico de Producción Láctea */}
        <div className="mt-6">
          <MilkProductionChart
            data={productions}
            title="Tendencia de Producción de Leche"
            height={350}
          />
        </div>
      </section>

      {/* Sección: Finanzas */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-success" />
          Finanzas
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Balance"
            value={`$${(stats?.financial.balance || 0).toLocaleString('es-CO')}`}
            description="Ingresos - Gastos"
            loading={isLoading}
            variant={stats?.financial.balance && stats.financial.balance >= 0 ? 'positive' : 'negative'}
          />
          <StatCard
            title="Ingresos"
            value={`$${(stats?.financial.income || 0).toLocaleString('es-CO')}`}
            description="Total ingresos"
            loading={isLoading}
            variant="positive"
          />
          <StatCard
            title="Gastos"
            value={`$${(stats?.financial.expenses || 0).toLocaleString('es-CO')}`}
            description="Total gastos"
            loading={isLoading}
            variant="negative"
          />
          <StatCard
            title="Transacciones"
            value={stats?.financial.totalTransactions || 0}
            description="Número de registros"
            loading={isLoading}
          />
        </div>

        {/* Gráfico de Finanzas */}
        <div className="mt-6">
          <FinancialChart
            data={transactions}
            title="Resumen Financiero"
            height={400}
          />
        </div>
      </section>

      {/* Sección: Reproducción */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-500" />
          Reproducción
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Eventos"
            value={stats?.reproduction.totalEvents || 0}
            description="Total eventos registrados"
            loading={isLoading}
          />
          <StatCard
            title="Preñeces Activas"
            value={stats?.reproduction.activePregnancies || 0}
            description="Animales gestando"
            loading={isLoading}
            variant="positive"
          />
          <StatCard
            title="Partos Próximos"
            value={stats?.reproduction.pendingBirths || 0}
            description="En los próximos 60 días"
            loading={isLoading}
            variant="warning"
          />
          <StatCard
            title="Tasa Concepción"
            value={stats?.reproduction.conceptionRate !== null
              ? `${stats?.reproduction.conceptionRate.toFixed(1)}%`
              : 'N/A'}
            description="Efectividad inseminación"
            loading={isLoading}
          />
        </div>

        {/* Gráfico de Reproducción */}
        <div className="mt-6">
          <ReproductionChart
            summary={reproSummary}
            pendingBirths={pendingBirths}
            title="Estadísticas Reproductivas"
            height={400}
          />
        </div>
      </section>

      {/* Sección: Inventario */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-orange-500" />
          Inventario
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Movimientos"
            value={stats?.inventory.totalMovements || 0}
            description="Movimientos recientes"
            loading={isLoading}
          />
          <StatCard
            title="Stock Bajo"
            value={stats?.inventory.lowStockItems || 0}
            description="Items por reponer"
            loading={isLoading}
            variant={stats?.inventory.lowStockItems && stats.inventory.lowStockItems > 0 ? 'warning' : 'positive'}
          />
          <StatCard
            title="Por Vencer"
            value={stats?.inventory.expiringItems || 0}
            description="Items próximos a vencer"
            loading={isLoading}
            variant={stats?.inventory.expiringItems && stats.inventory.expiringItems > 0 ? 'warning' : 'positive'}
          />
        </div>
      </section>

      {/* Sección: Actividad Operativa */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-500" />
          Actividad Operativa
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Vacunaciones"
            value={dashboardData?.vacunas_aplicadas?.valor || 0}
            description="Total vacunas aplicadas"
            loading={dashboardStatsLoading}
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          />
          <StatCard
            title="Controles Veterinarios"
            value={dashboardData?.controles_realizados?.valor || 0}
            description="Chequeos de salud"
            loading={dashboardStatsLoading}
            icon={<Activity className="h-4 w-4 text-info" />}
          />
          <StatCard
            title="Tratamientos Clínicos"
            value={dashboardData?.tratamientos_totales?.valor || 0}
            description="Tratamientos registrados"
            loading={dashboardStatsLoading}
            icon={<Package className="h-4 w-4 text-warning" />}
          />
          <StatCard
            title="Alertas de Finca"
            value={dashboardData?.alertas_sistema?.valor || 0}
            description="Alertas operativas activas"
            loading={dashboardStatsLoading}
            icon={<Bell className="h-4 w-4 text-destructive" />}
          />
        </div>
      </section>

      {/* Sección: Métricas de Animales (Radar) */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Radar className="h-5 w-5 text-indigo-500" />
          Métricas de Animales
        </h2>
        <AnimalMetricsRadar
          data={animals?.map((animal: any) => {
            const animalProductions = productions?.filter((p: any) => p.animal_id === animal.id) || [];
            const totalLiters = animalProductions.reduce((sum: number, p: any) => sum + p.liters, 0);
            const avgLiters = animalProductions.length > 0 ? totalLiters / animalProductions.length : 0;
            const productionScore = (animal.sex === 'Hembra' || animal.sex === 'Female')
              ? Math.min(100, (avgLiters / 30) * 100)
              : 0;

            let healthScore = 100;
            if (animal.health_indicator === 'warning') healthScore = 70;
            else if (animal.health_indicator === 'critical') healthScore = 30;

            const reproScore = (animal.sex === 'Hembra' || animal.sex === 'Female')
              ? (animal.is_pregnant ? 100 : animal.is_lactating ? 80 : 0)
              : 0;

            const weightScore = animal.weight ? Math.min(100, (animal.weight / 600) * 100) : 0;

            const ageMonths = animal.birth_date
              ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
              : 0;
            const ageScore = Math.min(100, (ageMonths / 72) * 100);

            return {
              name: animal.name || animal.record || `Animal ${animal.id}`,
              production: productionScore,
              health: healthScore,
              reproduction: reproScore,
              weight: weightScore,
              age: ageScore,
            };
          }) || []}
          title="Análisis de Rendimiento por Animal"
          height={400}
        />
      </section>

      {/* Sección: Correlación Peso vs Edad (Scatter) */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ScatterChart className="h-5 w-5 text-pink-500" />
          Correlación Peso vs Edad
        </h2>
        <WeightAgeScatter
          data={animals?.map((animal: any) => {
            const animalProductions = productions?.filter((p: any) => p.animal_id === animal.id) || [];
            const totalLiters = animalProductions.reduce((sum: number, p: any) => sum + p.liters, 0);
            const avgLiters = animalProductions.length > 0 ? totalLiters / animalProductions.length : 0;

            const ageMonths = animal.birth_date
              ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
              : 0;

            return {
              id: animal.id,
              name: animal.name || animal.record || `Animal ${animal.id}`,
              age: ageMonths,
              weight: animal.weight || 0,
              production: (animal.sex === 'Hembra' || animal.sex === 'Female') ? avgLiters : 0,
              sex: ((animal.sex === 'Hembra' || animal.sex === 'Female') ? 'Hembra' : 'Macho') as 'Macho' | 'Hembra',
              breed: animal.breed?.name || 'Holstein',
            };
          }) || []}
          title="Relación Peso-Edad por Sexo"
          height={450}
        />
      </section>

      {/* Sección: Mapa de Calor de Actividad */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Mapa de Calor de Actividad
        </h2>
        <ActivityHeatmap
          data={productions?.flatMap(p => {
            // Generar datos de actividad basados en producción
            const hour = p.milking_session === 'AM' ? 6 : p.milking_session === 'PM' ? 18 : 12;
            return [
              {
                date: p.date,
                hour: hour,
                value: Math.min(100, (p.liters / 25) * 100),
                type: 'milking' as const,
              },
              {
                date: p.date,
                hour: hour - 1,
                value: Math.min(100, (p.liters / 25) * 80),
                type: 'movement' as const,
              },
              {
                date: p.date,
                hour: hour + 1,
                value: Math.min(100, (p.liters / 25) * 60),
                type: 'rest' as const,
              },
            ];
          }) || []}
          title="Patrones de Actividad Semanal"
        />
      </section>

      {/* La cobertura de la base ya no se infiere de una lista manual: se lee del esquema real. */}
      <section className="mt-8">
        <DatabaseSchemaExplorer
          counts={Object.fromEntries(
            Object.entries(dashboardData ?? {}).map(([key, value]) => {
              const metricValue = (value as { valor?: unknown } | undefined)?.valor;
              return [key, typeof metricValue === 'number' ? metricValue : undefined];
            })
          )}
        />
      </section>
    </div>
  );
}

// Componente auxiliar para tarjetas de estadísticas
interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  loading: boolean;
  variant?: 'default' | 'positive' | 'negative' | 'warning';
  icon?: React.ReactNode;
}

function StatCard({ title, value, description, loading, variant = 'default', icon }: StatCardProps) {
  const variantStyles = {
    default: 'border-l-4 border-border',
    positive: 'border-l-4 border-success',
    negative: 'border-l-4 border-destructive',
    warning: 'border-l-4 border-warning',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
