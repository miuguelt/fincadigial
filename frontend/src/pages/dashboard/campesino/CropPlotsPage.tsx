import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { campesinoServices, CropPlot } from '@/entities/campesino';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconSprout, IconCalendar, IconMapPin } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { fieldService } from '@/entities/field/api/field.service';

const CropPlotsPage: React.FC = () => {
  const [fields, setFields] = React.useState<{ label: string; value: any }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadFields = async () => {
      try {
        const data = await fieldService.getAll();
        setFields(
          data.map((f: any) => ({
            label: f.name || f.nombre || `Potrero #${f.id}`,
            value: f.id,
          }))
        );
      } catch (error) {
        console.error('Error loading fields for crop plots:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFields();
  }, []);

  const initialFormData: Partial<CropPlot> = {
    name: '',
    crop_name: '',
    status: 'planned',
    area_unit: 'ha',
  };

  const columns: CRUDColumn<CropPlot>[] = [
    {
      key: 'name',
      label: 'Parcela',
      render: (val: string, item: CropPlot) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{val}</span>
          <span className="text-xs text-muted-foreground">{item.crop_name || 'Sin cultivo'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          planned: 'outline',
          active: 'default',
          harvested: 'secondary',
          lost: 'destructive',
        };
        const labels: Record<string, string> = {
          planned: 'Planificada',
          active: 'Activa',
          harvested: 'Cosechada',
          lost: 'Perdida',
        };
        return <Badge variant={variants[val] || 'outline'}>{labels[val] || val}</Badge>;
      },
    },
    {
      key: 'area',
      label: 'Área',
      render: (val: number, item: CropPlot) => (
        <div className="flex items-center gap-1">
          <IconMapPin size="sm" />
          {val ? `${val} ${item.area_unit || 'ha'}` : '-'}
        </div>
      ),
    },
    {
      key: 'sowing_date',
      label: 'Siembra',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {val ? formatDateColombia(val) : '-'}
        </div>
      ),
    },
    {
      key: 'expected_harvest_date',
      label: 'Cosecha Est.',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {val ? formatDateColombia(val) : '-'}
        </div>
      ),
    },
  ];

  const formSections: CRUDFormSection<Partial<CropPlot>>[] = [
    {
      title: 'Información de la Parcela',
      fields: [
        {
          name: 'name',
          label: 'Nombre de la Parcela',
          type: 'text',
          required: true,
          placeholder: 'Ej: Lote Norte, Parcela 1',
        },
        {
          name: 'field_id',
          label: 'Potrero Asociado',
          type: 'select',
          options: fields,
          loading: loading,
          placeholder: 'Seleccionar potrero (opcional)',
        },
        {
          name: 'crop_name',
          label: 'Cultivo',
          type: 'text',
          required: true,
          placeholder: 'Ej: Maíz, Yuca, Pasto',
        },
        {
          name: 'variety',
          label: 'Variedad',
          type: 'text',
          placeholder: 'Ej: ICA V-105, Criolla',
        },
      ],
    },
    {
      title: 'Dimensiones y Fechas',
      fields: [
        {
          name: 'area',
          label: 'Área',
          type: 'number',
          min: 0,
          step: 0.01,
          placeholder: '0.00',
        },
        {
          name: 'area_unit',
          label: 'Unidad de Área',
          type: 'select',
          options: [
            { label: 'Hectáreas (ha)', value: 'ha' },
            { label: 'Metros² (m²)', value: 'm2' },
            { label: 'Fanegadas', value: 'fanegada' },
          ],
        },
        {
          name: 'sowing_date',
          label: 'Fecha de Siembra',
          type: 'date',
        },
        {
          name: 'expected_harvest_date',
          label: 'Fecha Estimada de Cosecha',
          type: 'date',
        },
        {
          name: 'harvest_date',
          label: 'Fecha Real de Cosecha',
          type: 'date',
        },
      ],
    },
    {
      title: 'Estado y Detalles',
      fields: [
        {
          name: 'status',
          label: 'Estado',
          type: 'select',
          required: true,
          options: [
            { label: 'Planificada', value: 'planned' },
            { label: 'Activa', value: 'active' },
            { label: 'Cosechada', value: 'harvested' },
            { label: 'Perdida', value: 'lost' },
          ],
        },
        {
          name: 'seed_source',
          label: 'Fuente de Semilla',
          type: 'text',
          placeholder: 'Ej: ICA, Propia, Vecino',
        },
        {
          name: 'notes',
          label: 'Observaciones',
          type: 'textarea',
          placeholder: 'Detalles adicionales sobre la parcela...',
        },
      ],
    },
  ];

  const config: CRUDConfig<CropPlot, Partial<CropPlot>> = {
    entityName: 'Parcela',
    title: 'Gestión de Parcelas y Cultivos',
    searchPlaceholder: 'Buscar por nombre o cultivo...',
    columns,
    formSections,
    enableEdit: true,
    enableDelete: true,
  };

  return (
    <AdminCRUDPage config={config} service={campesinoServices.cropPlots} initialFormData={initialFormData} />
  );
};

export default CropPlotsPage;
