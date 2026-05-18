import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { operationalService, OperationalCost } from '@/entities/operational/api/operational.service';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconCash, IconCalendar, IconTag } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';

const OperationalCostsPage: React.FC = () => {
  const initialFormData: Partial<OperationalCost> = {
    concept: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'General',
  };

  const columns: CRUDColumn<OperationalCost>[] = [
    {
      key: 'concept',
      label: 'Concepto',
      render: (val: string) => <span className="font-bold">{val}</span>
    },
    {
      key: 'amount',
      label: 'Monto',
      render: (val: number) => (
        <div className="flex items-center gap-1 font-bold text-emerald-600">
          <IconCash size="sm" />
          $ {val.toLocaleString('es-CO')}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Categoría',
      render: (val: string) => (
        <Badge variant="outline" className="flex items-center gap-1 w-fit">
          <IconTag size="sm" />
          {val}
        </Badge>
      )
    },
    {
      key: 'date',
      label: 'Fecha',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {formatDateColombia(val)}
        </div>
      )
    }
  ];

  const formSections: CRUDFormSection<Partial<OperationalCost>>[] = [
    {
      title: 'Detalles del Gasto',
      fields: [
        {
          name: 'concept',
          label: 'Concepto',
          type: 'text',
          required: true,
          placeholder: 'Ej: Compra de concentrado',
        },
        {
          name: 'amount',
          label: 'Monto ($)',
          type: 'number',
          required: true,
          // @ts-ignore
          min: 0,
        },
        {
          name: 'date',
          label: 'Fecha',
          type: 'date',
          required: true,
        },
        {
          name: 'category',
          label: 'Categoría',
          type: 'select',
          required: true,
          options: [
            { label: 'Alimentación', value: 'Alimentación' },
            { label: 'Salud/Medicina', value: 'Salud' },
            { label: 'Mantenimiento', value: 'Mantenimiento' },
            { label: 'Mano de Obra', value: 'Personal' },
            { label: 'Impuestos/Legal', value: 'Legal' },
            { label: 'Otros', value: 'Otros' },
          ],
        },
        {
          name: 'notes',
          label: 'Observaciones',
          type: 'textarea',
          placeholder: 'Detalles adicionales del gasto...',
        },
      ]
    }
  ];

  const config: CRUDConfig<OperationalCost, Partial<OperationalCost>> = {
    entityName: 'Gasto Operativo',
    title: 'Gastos Operativos de la Finca',
    searchPlaceholder: 'Buscar por concepto...',
    columns,
    formSections,
    enableEdit: true,
    enableDelete: true,
    // @ts-ignore
    enableDetail: true,
  };

  return (
    <AdminCRUDPage
      config={config}
      service={operationalService}
      initialFormData={initialFormData}
    />
  );
};

export default OperationalCostsPage;

