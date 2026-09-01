import React, { useState } from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/types/crud';
import { alertService, AlertConfig } from '@/entities/alert/api/alert.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Bell, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';

const AlertConfigsPage: React.FC = () => {
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const columns: CRUDColumn<AlertConfig>[] = [
    {
      key: 'alert_type',
      label: 'Tipo',
      render: (v) => {
        const iconMap: Record<string, React.ReactNode> = {
          'Salud': <ShieldCheck className="h-4 w-4 text-emerald-500" />,
          'Crecimiento': <Zap className="h-4 w-4 text-info" />,
          'Producción': <Bell className="h-4 w-4 text-warning" />,
          'Reproducción': <Zap className="h-4 w-4 text-pink-500" />
        };
        return (
          <div className="flex items-center gap-2">
            {iconMap[v as string] || <Bell className="h-4 w-4 text-muted-foreground" />}
            <span className="font-bold">{v as string}</span>
          </div>
        );
      }
    },
    { key: 'dimension', label: 'Dimensión/Campo' },
    { key: 'condition_value', label: 'Condición' },
    { key: 'message', label: 'Mensaje' },
    {
      key: 'priority',
      label: 'Prioridad',
      render: (v) => {
        const priority = v as string;
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          'Crítica': 'destructive',
          'Alta': 'default',
          'Media': 'secondary',
          'Baja': 'outline'
        };
        return <Badge variant={variants[priority] || 'outline'}>{priority}</Badge>;
      }
    },
    {
      key: 'is_active',
      label: 'Estado',
      render: (v) => (
        <Badge variant={v ? 'default' : 'outline'} className={v ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
          {v ? 'Activa' : 'Inactiva'}
        </Badge>
      )
    },
  ];

  const formSections: CRUDFormSection<AlertConfig>[] = [
    {
      title: 'Configuración de Regla de Alerta',
      gridCols: 2,
      fields: [
        {
          name: 'alert_type',
          label: 'Tipo de Alerta',
          type: 'select',
          required: true,
          options: [
            { value: 'Salud', label: '🩺 Salud / Sanidad' },
            { value: 'Crecimiento', label: '📈 Crecimiento / Peso' },
            { value: 'Producción', label: '🥛 Producción / Leche' },
            { value: 'Reproducción', label: '🧬 Reproducción' },
            { value: 'Personalizada', label: '⚙️ Personalizada' }
          ]
        },
        {
          name: 'priority',
          label: 'Prioridad',
          type: 'select',
          required: true,
          options: [
            { value: 'Baja', label: 'Baja' },
            { value: 'Media', label: 'Media' },
            { value: 'Alta', label: 'Alta' },
            { value: 'Crítica', label: 'Crítica' }
          ]
        },
        {
          name: 'dimension',
          label: 'Dimensión (Atributo)',
          type: 'text',
          required: true,
          placeholder: 'Ej: peso, dias_sin_control, temperatura'
        },
        {
          name: 'condition_value',
          label: 'Condición (Valor Crítico)',
          type: 'text',
          required: true,
          placeholder: 'Ej: < 400, > 30'
        },
        {
          name: 'message',
          label: 'Mensaje de la Alerta',
          type: 'text',
          required: true,
          colSpan: 2,
          placeholder: 'Ej: El animal ha perdido peso significativamente'
        },
        {
          name: 'animal_id',
          label: 'Aplicar a Animal Específico (Opcional)',
          type: 'select',
          loadOptions: async () => {
            const data = await animalsService.getAnimals({ limit: 1000 });
            return ((data as any[]) || []).map((a: any) => ({ value: a.id, label: a.record }));
          },
          placeholder: 'Si se deja vacío, aplica a toda la finca'
        } as any,
        { name: 'is_active', label: 'Regla Activa', type: 'checkbox', defaultValue: true } as any,
      ],
    },
  ];

  const config: CRUDConfig<AlertConfig> = {
    title: 'Configuración de Alertas Personalizadas',
    entityName: 'Regla de Alerta',
    columns,
    formSections,
    searchPlaceholder: 'Buscar reglas...',
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
  };

  // Adaptar el servicio para que use los métodos específicos de configs
  const configService = Object.assign(Object.create(alertService), {
    getAll: (params: any) => alertService.getConfigs(params),
    getPaginated: (params: any) => alertService.getConfigs(params),
    create: (data: any) => alertService.saveConfig(data),
    update: (id: any, data: any) => alertService.saveConfig({ ...data, id }),
    delete: (id: any) => alertService.deleteConfig(id),
  });

  const handleInitializeDefaults = async () => {
    const defaults: Partial<AlertConfig>[] = [
      { alert_type: 'Salud', dimension: 'dias_sin_control', condition_value: '> 30', message: 'Animal requiere chequeo preventivo (más de 30 días sin control)', priority: 'Media', is_active: true },
      { alert_type: 'Producción', dimension: 'dias_en_potrero', condition_value: '> 15', message: 'Rotación recomendada: el animal lleva más de 15 días en el mismo potrero', priority: 'Alta', is_active: true },
      { alert_type: 'Salud', dimension: 'salud', condition_value: '== "Malo"', message: 'Estado de salud crítico detectado', priority: 'Crítica', is_active: true },
      { alert_type: 'Producción', dimension: 'rendimiento_leche_diario', condition_value: '< 5', message: 'Producción de leche por debajo del umbral mínimo esperado', priority: 'Alta', is_active: true }
    ];

    try {
      for (const rule of defaults) {
        await alertService.saveConfig(rule as AlertConfig);
      }
      setRefreshKey(k => k + 1);
      showToast('Reglas inicializadas correctamente', 'success');
    } catch (error) {
      console.error('Error inicializando reglas:', error);
      showToast('Error al inicializar reglas', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-warning/5 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning mt-1" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-900">Estrategia de Alertas Inteligentes</h4>
            <Button size="sm"
              variant="outline"
              onClick={handleInitializeDefaults}
              className="bg-card border-amber-300 text-warning hover:bg-warning/10 h-8 text-[11px] font-black uppercase"
            >
              Inicializar Reglas Sugeridas
            </Button>
          </div>
          <p className="text-xs text-warning leading-relaxed mt-1">
            Las reglas definidas aquí se evalúan automáticamente. En zonas de baja señal, el sistema evalúa estas reglas localmente contra los datos capturados en el dispositivo para generar alertas inmediatas sin necesidad de conexión.
          </p>
        </div>
      </div>

      <AdminCRUDPage
        key={refreshKey}
        config={config as any}
        service={configService}
        initialFormData={{
          alert_type: 'Salud',
          priority: 'Media',
          is_active: true,
          dimension: '',
          condition_value: '',
          message: ''
        }}
        validateForm={(data) => {
          if (!data.message) return 'El mensaje es obligatorio';
          if (!data.condition_value) return 'La condición es obligatoria';
          return null;
        }}
      />
    </div>
  );
};

export default AlertConfigsPage;
