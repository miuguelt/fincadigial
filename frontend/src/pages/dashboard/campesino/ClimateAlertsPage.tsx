import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { campesinoServices, ClimateRiskAlert } from '@/entities/campesino';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconAlertTriangle, IconCalendar } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';

const ClimateAlertsPage: React.FC = () => {
  const initialFormData: Partial<ClimateRiskAlert> = {
    title: '',
    risk_type: '',
    severity: 'medium',
    is_active: true,
  };

  const columns: CRUDColumn<ClimateRiskAlert>[] = [
    {
      key: 'title',
      label: 'Alerta',
      render: (val: string, item: ClimateRiskAlert) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{val}</span>
          <span className="text-xs text-muted-foreground">{item.risk_type || '-'}</span>
        </div>
      ),
    },
    {
      key: 'severity',
      label: 'Severidad',
      render: (val: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          low: 'secondary',
          medium: 'outline',
          high: 'default',
          critical: 'destructive',
        };
        const labels: Record<string, string> = {
          low: 'Baja',
          medium: 'Media',
          high: 'Alta',
          critical: 'Crítica',
        };
        return <Badge variant={variants[val] || 'outline'}>{labels[val] || val}</Badge>;
      },
    },
    {
      key: 'is_active',
      label: 'Estado',
      render: (val: boolean) => (
        val ? (
          <Badge variant="default" className="bg-green-500">Activa</Badge>
        ) : (
          <Badge variant="secondary">Inactiva</Badge>
        )
      ),
    },
    {
      key: 'valid_from',
      label: 'Válida Desde',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {val ? formatDateColombia(val) : '-'}
        </div>
      ),
    },
    {
      key: 'valid_until',
      label: 'Válida Hasta',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {val ? formatDateColombia(val) : '-'}
        </div>
      ),
    },
  ];

  const formSections: CRUDFormSection<Partial<ClimateRiskAlert>>[] = [
    {
      title: 'Datos de la Alerta',
      fields: [
        {
          name: 'title',
          label: 'Título',
          type: 'text',
          required: true,
          placeholder: 'Ej: Helada prevista, Sequía prolongada',
        },
        {
          name: 'risk_type',
          label: 'Tipo de Riesgo',
          type: 'text',
          required: true,
          placeholder: 'Ej: Helada, Sequía, Inundación, Plaga',
        },
        {
          name: 'severity',
          label: 'Severidad',
          type: 'select',
          required: true,
          options: [
            { label: 'Baja', value: 'low' },
            { label: 'Media', value: 'medium' },
            { label: 'Alta', value: 'high' },
            { label: 'Crítica', value: 'critical' },
          ],
        },
        {
          name: 'description',
          label: 'Descripción',
          type: 'textarea',
          placeholder: 'Detalles del riesgo...',
        },
      ],
    },
    {
      title: 'Vigencia y Recomendaciones',
      fields: [
        {
          name: 'valid_from',
          label: 'Válida Desde',
          type: 'datetime-local',
        },
        {
          name: 'valid_until',
          label: 'Válida Hasta',
          type: 'datetime-local',
        },
        {
          name: 'recommendation',
          label: 'Recomendación',
          type: 'textarea',
          placeholder: 'Acciones sugeridas para mitigar el riesgo...',
        },
        {
          name: 'source',
          label: 'Fuente',
          type: 'text',
          placeholder: 'Ej: IDEAM, Observación local',
        },
        {
          name: 'is_active',
          label: '¿Alerta Activa?',
          type: 'checkbox',
        },
      ],
    },
  ];

  const config: CRUDConfig<ClimateRiskAlert, Partial<ClimateRiskAlert>> = {
    entityName: 'Alerta',
    title: 'Alertas Climáticas y de Riesgo',
    searchPlaceholder: 'Buscar por título o tipo...',
    columns,
    formSections,
    enableEdit: true,
    enableDelete: true,
  };

  return (
    <AdminCRUDPage config={config} service={campesinoServices.climateRisks} initialFormData={initialFormData} />
  );
};

export default ClimateAlertsPage;
