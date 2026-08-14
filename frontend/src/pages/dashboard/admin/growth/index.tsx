import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { animalService } from '@/entities/animal/api/animal.service';
import { growthService } from '@/entities/growth/api/growth.service';
import type { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig } from '@/shared/types/crud';
import { TrendingUp, Activity } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';

const GrowthPage: React.FC = () => {
  const initialFormData: any = {};

  const GrowthDetailContent = ({ item }: { item: AnimalResponse }) => {
    const [growthData, setGrowthData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      growthService.getAnimalGrowth(item.id)
        .then(setGrowthData)
        .finally(() => setLoading(false));
    }, [item.id]);

    if (loading) return <div className="p-8 text-center">Cargando curva de crecimiento...</div>;
    if (!growthData || !growthData.data_points || growthData.data_points.length === 0) {
      return (
        <div className="p-8 text-center border-2 border-dashed rounded-xl border-border/50">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No hay suficientes registros de pesaje para este animal.</p>
          <p className="text-sm text-muted-foreground/70">Registra controles de peso en la sección de Controles Sanitarios.</p>
        </div>
      );
    }

    const { stats } = growthData;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <span className="text-xs text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Score de Crecimiento</span>
            <span className={`text-2xl font-black ${
              stats.growth_score > 70
                ? 'text-success-600 dark:text-success-400'
                : stats.growth_score > 40
                  ? 'text-primary'
                  : 'text-destructive'
            }`}>
              {stats.growth_score}/100
            </span>
          </div>
          <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/10">
            <span className="text-xs text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">GMD (Promedio Diario)</span>
            <span className="text-2xl font-black text-secondary">
              {stats.avg_daily_gain_kg} <small className="text-xs font-normal">kg/día</small>
            </span>
          </div>
          <div className="bg-accent/5 p-4 rounded-xl border border-accent/10">
            <span className="text-xs text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Desviación Ref.</span>
            <span className={`text-2xl font-black ${
              stats.current_deviation_pct >= 0
                ? 'text-success-600 dark:text-success-400'
                : 'text-warning-600 dark:text-warning-400'
            }`}>
              {stats.current_deviation_pct > 0 ? '+' : ''}{stats.current_deviation_pct}%
            </span>
          </div>
          <div className="bg-muted/5 p-4 rounded-xl border border-muted-foreground/10">
            <span className="text-xs text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Tendencia</span>
            <Badge className={`mt-1 ${
              stats.trend === 'positivo'
                ? getStatusBadgeClass('success')
                : stats.trend === 'negativo'
                  ? getStatusBadgeClass('danger')
                  : getStatusBadgeClass('warning')
            }`}>
              {(stats.trend || 'S/D').toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="bg-card border-2 border-border/50 rounded-lg p-6 shadow-sm overflow-hidden h-[400px]">
          <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Curva de Crecimiento (Peso vs Tiempo)
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={growthData.data_points} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="age_months" 
                label={{ value: 'Edad (Meses)', position: 'insideBottom', offset: -5 }} 
              />
              <YAxis 
                label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#8884d8" 
                name="Peso Real" 
                strokeWidth={3}
                dot={{ r: 6, fill: '#8884d8', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8 }}
              />
              <Line 
                type="monotone" 
                dataKey="expected_weight" 
                stroke="#10b981" 
                name="Referencia Bovina" 
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const crudConfig: CRUDConfig<AnimalResponse, any> = {
    entityName: 'Crecimiento de Animal',
    title: 'Análisis de Crecimiento',
    searchPlaceholder: 'Buscar por registro...',
    columns: [
      {
        key: 'record',
        label: 'Animal',
        render: (val: any) => <span className="font-bold text-primary">{val}</span>
      },
      {
        key: 'sex',
        label: 'Sexo',
        render: (val: any) => <Badge variant="outline">{val}</Badge>
      },
      {
        key: 'age_in_months',
        label: 'Edad',
        render: (val: any) => <span>{val} meses</span>
      },
      {
        key: 'weight',
        label: 'Peso Actual',
        render: (val: any) => <span className="font-medium">{val} kg</span>
      },
    ],
    formSections: [],
    enableCreateModal: false,
    enableEditModal: false,
    enableDelete: false,
    enableDetailModal: true,
  };

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={animalService}
      initialFormData={initialFormData}
      customDetailContent={(item) => <GrowthDetailContent item={item} />}
    />
  );
};

export default GrowthPage;
