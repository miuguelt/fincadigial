import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { activityLogService, ActivityLog } from '@/entities/activity-log/api/activityLog.service';
import { CRUDConfig, CRUDColumn } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconUser, IconBox, IconAlertCircle, IconCircleCheck, IconInfoCircle, IconAlertTriangle } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';

const ActivityLogPage: React.FC = () => {
  const columns: CRUDColumn<ActivityLog>[] = [
    {
      key: 'created_at',
      label: 'Fecha/Hora',
      render: (val: string) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium">{formatDateColombia(val)}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(val).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      key: 'severity',
      label: 'Nivel',
      hiddenOnMobile: true,
      render: (val: string) => {
        switch (val) {
case 'error': return <Badge variant="destructive" className="flex gap-1"><IconAlertCircle size="sm" /> Error</Badge>;
          case 'warning': return <Badge variant="warning" className="flex gap-1"><IconAlertTriangle size="sm" /> Aviso</Badge>;
          case 'success': return <Badge variant="success" className="flex gap-1"><IconCircleCheck size="sm" /> Éxito</Badge>;
          default: return <Badge variant="secondary" className="flex gap-1"><IconInfoCircle size="sm" /> Info</Badge>;
        }
      }
    },
    {
      key: 'actor',
      label: 'Usuario',
      render: (val: any, item: ActivityLog) => (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-[var(--radius-full)] bg-muted flex items-center justify-center hidden sm:flex">
            <IconUser size="sm" className="text-muted-foreground" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium truncate max-w-[80px] sm:max-w-none">
            {val?.fullname || item.actor_id || 'Sistema'}
          </span>
        </div>
      )
    },
    {
      key: 'entity',
      label: 'Entidad',
      hiddenOnMobile: true,
      render: (val: string, item: ActivityLog) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <IconBox size="sm" className="text-primary/60" />
            <span className="text-xs font-bold uppercase">{val}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">ID: {item.entity_id || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Acción',
      hiddenOnMobile: true,
      render: (val: string) => (
        <Badge variant="outline" className="text-[10px] uppercase font-bold">
          {val}
        </Badge>
      )
    },
    {
      key: 'title',
      label: 'Descripción',
      render: (val: string, item: ActivityLog) => (
        <div className="flex flex-col max-w-[150px] sm:max-w-[300px]">
          <span className="text-[11px] sm:text-xs font-medium line-clamp-1">{val || item.description || '-'}</span>
          {item.description && val !== item.description && (
            <span className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1 italic">{item.description}</span>
          )}
        </div>
      )
    }
  ];

  const config: CRUDConfig<ActivityLog, any> = {
    entityName: 'Actividad',
    title: 'Bitácora de Operaciones',
    searchPlaceholder: 'Buscar registros...',
    columns,
    formSections: [], // Read-only
    enableCreateModal: false,
    enableEditModal: false,
    enableDelete: false,
    enableDetailModal: true,
  };

  return (
    <AdminCRUDPage
      config={config}
      service={activityLogService}
      initialFormData={{}}
    />
  );
};

export default ActivityLogPage;

