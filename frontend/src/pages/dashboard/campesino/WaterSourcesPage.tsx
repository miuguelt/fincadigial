import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { campesinoServices, WaterSource } from '@/entities/campesino';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconMapPin, IconCheck, IconX } from '@/shared/ui/icons';
import { Droplets } from 'lucide-react';

const WaterSourcesPage: React.FC = () => {
  const initialFormData: Partial<WaterSource> = {
    name: '',
    source_type: 'other',
    is_potable: false,
  };

  const columns: CRUDColumn<WaterSource>[] = [
    {
      key: 'name',
      label: 'Fuente',
      render: (val: string, item: WaterSource) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{val}</span>
          <span className="text-xs text-muted-foreground capitalize">{item.source_type || '-'}</span>
        </div>
      ),
    },
    {
      key: 'source_type',
      label: 'Tipo',
      render: (val: string) => {
        const labels: Record<string, string> = {
          stream: 'Quebrada',
          well: 'Pozo',
          reservoir: 'Reservorio',
          rainwater: 'Agua Lluvia',
          public_supply: 'Acueducto',
          other: 'Otro',
        };
        return <Badge variant="outline">{labels[val] || val}</Badge>;
      },
    },
    {
      key: 'capacity_liters',
      label: 'Capacidad',
      render: (val: number) => (
        <div className="flex items-center gap-1 text-xs">
          <Droplets size="sm" className="mr-1" />
          {val ? `${Number(val).toLocaleString('es-CO')} L` : '-'}
        </div>
      ),
    },
    {
      key: 'is_potable',
      label: 'Potable',
      render: (val: boolean) => (
        val ? (
          <Badge variant="default" className="bg-green-500">
            <IconCheck size="sm" className="mr-1" /> Sí
          </Badge>
        ) : (
          <Badge variant="secondary">
            <IconX size="sm" className="mr-1" /> No
          </Badge>
        )
      ),
    },
    {
      key: 'reliability',
      label: 'Confiabilidad',
      render: (val: string) => <span className="text-xs">{val || '-'}</span>,
    },
  ];

  const formSections: CRUDFormSection<Partial<WaterSource>>[] = [
    {
      title: 'Información de la Fuente',
      fields: [
        {
          name: 'name',
          label: 'Nombre',
          type: 'text',
          required: true,
          placeholder: 'Ej: Quebrada La Honda, Pozo Norte',
        },
        {
          name: 'source_type',
          label: 'Tipo de Fuente',
          type: 'select',
          required: true,
          options: [
            { label: 'Quebrada/Río', value: 'stream' },
            { label: 'Pozo', value: 'well' },
            { label: 'Reservorio/Estanque', value: 'reservoir' },
            { label: 'Captación Lluvia', value: 'rainwater' },
            { label: 'Acueducto Público', value: 'public_supply' },
            { label: 'Otro', value: 'other' },
          ],
        },
        {
          name: 'capacity_liters',
          label: 'Capacidad Estimada (Litros)',
          type: 'number',
          min: 0,
          step: 100,
          placeholder: '0',
        },
        {
          name: 'is_potable',
          label: '¿Es Potable?',
          type: 'checkbox',
        },
      ],
    },
    {
      title: 'Ubicación y Estado',
      fields: [
        {
          name: 'latitude',
          label: 'Latitud',
          type: 'number',
          step: 0.000001,
          placeholder: 'Ej: 4.6097',
        },
        {
          name: 'longitude',
          label: 'Longitud',
          type: 'number',
          step: 0.000001,
          placeholder: 'Ej: -74.0817',
        },
        {
          name: 'reliability',
          label: 'Confiabilidad',
          type: 'select',
          options: [
            { label: 'Alta', value: 'high' },
            { label: 'Media', value: 'medium' },
            { label: 'Baja', value: 'low' },
            { label: 'Estacional', value: 'seasonal' },
          ],
        },
        {
          name: 'notes',
          label: 'Observaciones',
          type: 'textarea',
          placeholder: 'Detalles sobre acceso, estado, etc.',
        },
      ],
    },
  ];

  const config: CRUDConfig<WaterSource, Partial<WaterSource>> = {
    entityName: 'Fuente de Agua',
    title: 'Gestión de Fuentes de Agua',
    searchPlaceholder: 'Buscar por nombre...',
    columns,
    formSections,
    enableEdit: true,
    enableDelete: true,
  };

  return (
    <AdminCRUDPage config={config} service={campesinoServices.waterSources} initialFormData={initialFormData} />
  );
};

export default WaterSourcesPage;
