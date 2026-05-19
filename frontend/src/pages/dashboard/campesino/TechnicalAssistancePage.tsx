import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { campesinoServices, TechnicalAssistanceRequest } from '@/entities/campesino';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconHeadset, IconCalendar, IconUser } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';

const TechnicalAssistancePage: React.FC = () => {
  const initialFormData: Partial<TechnicalAssistanceRequest> = {
    title: '',
    category: '',
    priority: 'medium',
    status: 'open',
  };

  const columns: CRUDColumn<TechnicalAssistanceRequest>[] = [
    {
      key: 'title',
      label: 'Solicitud',
      render: (val: string, item: TechnicalAssistanceRequest) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{val}</span>
          <span className="text-xs text-muted-foreground">{item.category || '-'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          open: 'outline',
          in_progress: 'default',
          resolved: 'secondary',
          closed: 'secondary',
        };
        const labels: Record<string, string> = {
          open: 'Abierta',
          in_progress: 'En Proceso',
          resolved: 'Resuelta',
          closed: 'Cerrada',
        };
        return <Badge variant={variants[val] || 'outline'}>{labels[val] || val}</Badge>;
      },
    },
    {
      key: 'priority',
      label: 'Prioridad',
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
      key: 'requested_at',
      label: 'Fecha Solicitud',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {val ? formatDateColombia(val) : '-'}
        </div>
      ),
    },
    {
      key: 'assigned_user_id',
      label: 'Asignado a',
      render: (_val: any, item: TechnicalAssistanceRequest) => (
        <div className="flex items-center gap-1 text-xs">
          <IconUser size="sm" />
          {item.assignee?.name || item.assignee?.username || 'Sin asignar'}
        </div>
      ),
    },
  ];

  const formSections: CRUDFormSection<Partial<TechnicalAssistanceRequest>>[] = [
    {
      title: 'Datos de la Solicitud',
      fields: [
        {
          name: 'title',
          label: 'Título',
          type: 'text',
          required: true,
          placeholder: 'Ej: Problema con cultivo de maíz, Asesoría ganadera',
        },
        {
          name: 'category',
          label: 'Categoría',
          type: 'text',
          required: true,
          placeholder: 'Ej: Cultivos, Ganadería, Sanidad, Maquinaria',
        },
        {
          name: 'description',
          label: 'Descripción',
          type: 'textarea',
          required: true,
          placeholder: 'Describe el problema o solicitud en detalle...',
        },
        {
          name: 'priority',
          label: 'Prioridad',
          type: 'select',
          required: true,
          options: [
            { label: 'Baja', value: 'low' },
            { label: 'Media', value: 'medium' },
            { label: 'Alta', value: 'high' },
            { label: 'Crítica', value: 'critical' },
          ],
        },
      ],
    },
    {
      title: 'Seguimiento',
      fields: [
        {
          name: 'status',
          label: 'Estado',
          type: 'select',
          options: [
            { label: 'Abierta', value: 'open' },
            { label: 'En Proceso', value: 'in_progress' },
            { label: 'Resuelta', value: 'resolved' },
            { label: 'Cerrada', value: 'closed' },
          ],
        },
        {
          name: 'resolution_notes',
          label: 'Notas de Resolución',
          type: 'textarea',
          placeholder: 'Detalles de la solución o seguimiento...',
        },
      ],
    },
  ];

  const config: CRUDConfig<TechnicalAssistanceRequest, Partial<TechnicalAssistanceRequest>> = {
    entityName: 'Solicitud',
    title: 'Solicitudes de Asistencia Técnica',
    searchPlaceholder: 'Buscar por título o categoría...',
    columns,
    formSections,
    enableEdit: true,
    enableDelete: true,
  };

  return (
    <AdminCRUDPage config={config} service={campesinoServices.technicalAssistance} initialFormData={initialFormData} />
  );
};

export default TechnicalAssistancePage;
