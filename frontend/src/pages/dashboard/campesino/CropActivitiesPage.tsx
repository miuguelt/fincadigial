import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { campesinoServices, CropActivity } from '@/entities/campesino';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconClipboardList, IconCalendar, IconCash, IconUser } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { cropPlotsService } from '@/entities/campesino/api/campesino.service';

const CropActivitiesPage: React.FC = () => {
  const [cropPlots, setCropPlots] = React.useState<{ label: string; value: any }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadCropPlots = async () => {
      try {
        const data = await cropPlotsService.getAll({ limit: 100 });
        setCropPlots(
          data.map((p: any) => ({
            label: `${p.name || 'Parcela'} - ${p.crop_name || 'Sin cultivo'}`,
            value: p.id,
          }))
        );
      } catch (error) {
        console.error('Error loading crop plots for activities:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCropPlots();
  }, []);

  const initialFormData: Partial<CropActivity> = {
    activity_date: new Date().toISOString().split('T')[0],
    activity_type: 'note',
  };

  const columns: CRUDColumn<CropActivity>[] = [
    {
      key: 'activity_date',
      label: 'Fecha',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {formatDateColombia(val)}
        </div>
      ),
    },
    {
      key: 'activity_type',
      label: 'Tipo',
      render: (val: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          sowing: 'default',
          irrigation: 'secondary',
          fertilization: 'outline',
          pest_control: 'destructive',
          harvest: 'default',
          note: 'secondary',
        };
        const labels: Record<string, string> = {
          sowing: 'Siembra',
          irrigation: 'Riego',
          fertilization: 'Fertilización',
          pest_control: 'Control Plagas',
          harvest: 'Cosecha',
          note: 'Nota',
        };
        return <Badge variant={variants[val] || 'outline'}>{labels[val] || val}</Badge>;
      },
    },
    {
      key: 'crop_plot_id',
      label: 'Parcela',
      render: (_val: any, item: CropActivity) => (
        <div className="text-xs">
          {item.crop_plot?.name || item.crop_plot?.crop_name || `ID: ${item.crop_plot_id}`}
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (val: string) => <span className="text-xs line-clamp-2">{val || '-'}</span>,
    },
    {
      key: 'cost',
      label: 'Costo',
      render: (val: number) => (
        <div className="flex items-center gap-1 text-xs font-medium">
          <IconCash size="sm" />
          {val ? `$${Number(val).toLocaleString('es-CO')}` : '-'}
        </div>
      ),
    },
    {
      key: 'performed_by',
      label: 'Realizado por',
      render: (_val: any, item: CropActivity) => (
        <div className="flex items-center gap-1 text-xs">
          <IconUser size="sm" />
          {item.actor?.name || item.actor?.username || '-'}
        </div>
      ),
    },
  ];

  const formSections: CRUDFormSection<Partial<CropActivity>>[] = [
    {
      title: 'Datos de la Labor',
      fields: [
        {
          name: 'crop_plot_id',
          label: 'Parcela',
          type: 'select',
          required: true,
          options: cropPlots,
          loading: loading,
          placeholder: 'Seleccionar parcela',
        },
        {
          name: 'activity_type',
          label: 'Tipo de Actividad',
          type: 'select',
          required: true,
          options: [
            { label: 'Siembra', value: 'sowing' },
            { label: 'Riego', value: 'irrigation' },
            { label: 'Fertilización', value: 'fertilization' },
            { label: 'Control de Plagas', value: 'pest_control' },
            { label: 'Cosecha', value: 'harvest' },
            { label: 'Nota/Observación', value: 'note' },
          ],
        },
        {
          name: 'activity_date',
          label: 'Fecha',
          type: 'date',
          required: true,
        },
        {
          name: 'description',
          label: 'Descripción',
          type: 'textarea',
          placeholder: 'Detalles de la labor realizada...',
        },
      ],
    },
    {
      title: 'Insumos y Costos',
      fields: [
        {
          name: 'input_name',
          label: 'Nombre del Insumo',
          type: 'text',
          placeholder: 'Ej: Urea, Glifosato, Semilla',
        },
        {
          name: 'quantity',
          label: 'Cantidad',
          type: 'number',
          min: 0,
          step: 0.01,
          placeholder: '0.00',
        },
        {
          name: 'unit',
          label: 'Unidad',
          type: 'text',
          placeholder: 'Ej: kg, L, bultos',
        },
        {
          name: 'cost',
          label: 'Costo ($)',
          type: 'number',
          min: 0,
          step: 100,
          placeholder: '0',
          helpText: 'Si ingresa un costo, se creará automáticamente un registro financiero.',
        },
      ],
    },
    {
      title: 'Responsable y Notas',
      fields: [
        {
          name: 'notes',
          label: 'Notas Adicionales',
          type: 'textarea',
          placeholder: 'Observaciones extra...',
        },
      ],
    },
  ];

  const config: CRUDConfig<CropActivity, Partial<CropActivity>> = {
    entityName: 'Labor',
    title: 'Bitácora de Labores de Cultivo',
    searchPlaceholder: 'Buscar por descripción o insumo...',
    columns,
    formSections,
    enableEdit: true,
    enableDelete: true,
  };

  return (
    <AdminCRUDPage config={config} service={campesinoServices.cropActivities} initialFormData={initialFormData} />
  );
};

export default CropActivitiesPage;
