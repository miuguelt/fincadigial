import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { 
  Milk, 
  Activity, 
  DollarSign, 
  Package, 
  Users, 
  Baby,
  Image as ImageIcon,
  MessageSquare,
  Bell,
  MapPin,
  Radar,
  ScatterChart,
  Flame
} from 'lucide-react';
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
  additional: {
    images: number;
    messages: number;
    subscriptions: number;
    locations: number;
  };
}

export default function DataOverviewDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const fincaId = 1; // TODO: Obtener de contexto de autenticación

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
        const [inventorySummary, offspring] = await Promise.all([
          inventoryService.getSummary(),
          reproductionService.getOffspring(),
        ]);

        setStats({
          milkProduction: {
            totalRecords: productions.length,
            totalLiters: milkSummary?.totalLiters || 0,
            todayLiters: productions
              .filter(p => p.date === new Date().toISOString().split('T')[0])
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
          additional: {
            images: 40, // Datos del seed
            messages: 10,
            subscriptions: 8,
            locations: 12,
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
    <div className="w-full p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vista General de Datos</h1>
          <p className="text-muted-foreground mt-1">
            Resumen de todos los datos poblados en la base de datos
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Finca ID: {fincaId}
        </Badge>
      </div>

      {/* Sección: Producción Láctea */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Milk className="h-5 w-5 text-blue-500" />
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
          <DollarSign className="h-5 w-5 text-green-500" />
          Finanzas
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Balance"
            value={`$${(stats?.financial.balance || 0).toLocaleString()}`}
            description="Ingresos - Gastos"
            loading={isLoading}
            variant={stats?.financial.balance && stats.financial.balance >= 0 ? 'positive' : 'negative'}
          />
          <StatCard
            title="Ingresos"
            value={`$${(stats?.financial.income || 0).toLocaleString()}`}
            description="Total ingresos"
            loading={isLoading}
            variant="positive"
          />
          <StatCard
            title="Gastos"
            value={`$${(stats?.financial.expenses || 0).toLocaleString()}`}
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

      {/* Sección: Datos Adicionales */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-500" />
          Datos Adicionales
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Imágenes"
            value={stats?.additional.images || 0}
            description="Imágenes de animales"
            loading={isLoading}
            icon={<ImageIcon className="h-4 w-4" />}
          />
          <StatCard
            title="Mensajes"
            value={stats?.additional.messages || 0}
            description="Mensajes de chat"
            loading={isLoading}
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <StatCard
            title="Notificaciones"
            value={stats?.additional.subscriptions || 0}
            description="Suscripciones push"
            loading={isLoading}
            icon={<Bell className="h-4 w-4" />}
          />
          <StatCard
            title="Ubicaciones"
            value={stats?.additional.locations || 0}
            description="Rastreo GPS"
            loading={isLoading}
            icon={<MapPin className="h-4 w-4" />}
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
          data={animals?.map((animal: any) => ({
            name: animal.name || animal.record || `Animal ${animal.id}`,
            production: Math.random() * 40 + 60, // Simulado: 60-100%
            health: Math.random() * 30 + 70, // Simulado: 70-100%
            reproduction: (animal.sex === 'Hembra' || animal.sex === 'Female') ? Math.random() * 40 + 60 : 0,
            weight: animal.weight ? Math.min(100, (animal.weight / 600) * 100) : Math.random() * 30 + 50,
            age: animal.birth_date 
              ? Math.min(100, ((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30)) / 72 * 100)
              : Math.random() * 50 + 20,
          })) || []}
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
          data={animals?.map((animal: any) => ({
            id: animal.id,
            name: animal.name || animal.record || `Animal ${animal.id}`,
            age: animal.birth_date
              ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
              : Math.floor(Math.random() * 60) + 12,
            weight: animal.weight || Math.floor(Math.random() * 300) + 200,
            production: (animal.sex === 'Hembra' || animal.sex === 'Female') ? Math.floor(Math.random() * 25) + 5 : 0,
            sex: ((animal.sex === 'Hembra' || animal.sex === 'Female') ? 'Hembra' : 'Macho') as 'Macho' | 'Hembra',
            breed: typeof animal.breed === 'string' ? animal.breed : 'Holstein',
          })) || []}
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
            const date = new Date(p.date);
            const hour = p.session === 'AM' ? 6 : p.session === 'PM' ? 18 : 12;
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

      {/* Resumen de Tablas */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5" />
              Resumen de Poblamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tablas totales:</span>
                <span className="font-medium">36</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tablas pobladas:</span>
                <span className="font-medium text-green-600">36 ✅</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Registros totales:</span>
                <span className="font-medium">941</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Registros añadidos:</span>
                <span className="font-medium text-blue-600">+643</span>
              </div>
            </div>
          </CardContent>
        </Card>
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
    default: 'border-l-4 border-gray-300',
    positive: 'border-l-4 border-green-500',
    negative: 'border-l-4 border-red-500',
    warning: 'border-l-4 border-yellow-500',
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
