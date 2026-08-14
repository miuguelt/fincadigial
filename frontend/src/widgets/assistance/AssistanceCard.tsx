import React from 'react';
import { User, Calendar, MessageCircle, Clock, AlertTriangle } from 'lucide-react';
import type { TechnicalAssistanceRequest } from '@/entities/campesino';
import { Badge } from '@/shared/ui/badge';
import { FitText } from '@/shared/ui/FitText';
import { getCategoryConfig, STATUS_CONFIG, PRIORITY_CONFIG, CONTACT_PHONE } from './assistance.constants';
import { timeAgo, isOverdue, formatDateLong } from './timeUtils';

interface AssistanceCardProps {
  item: TechnicalAssistanceRequest;
  onDetail: (item: TechnicalAssistanceRequest) => void;
  onCancel?: (item: TechnicalAssistanceRequest) => void;
}

/**
 * Tarjeta de solicitud de asistencia técnica.
 *
 * La tarjeta es `.fit-container`, así que las píldoras y los metadatos escalan
 * con el ancho de la propia tarjeta (`.text-fluid-xs`) en vez de desbordarla.
 * El título usa `<FitText>`: encoge antes que partir una palabra. Ninguna fila
 * pone en la misma línea dos bloques que no quepan — todas envuelven.
 * Ver docs/estandar-texto-adaptable.md.
 */
export const AssistanceCard = React.memo<AssistanceCardProps>(({ item, onDetail, onCancel }) => {
  const cat = getCategoryConfig(item.category || 'otro');
  const statusCfg = STATUS_CONFIG[item.status || 'open'] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
  const CatIcon = cat.icon;
  const elapsed = timeAgo(item.requested_at);
  const overdue = !item.assigned_user_id && isOverdue(item.requested_at);
  const assignee = item.assignee?.fullname;

  return (
    <div className="fit-container flex flex-col h-full min-w-0 bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <div className="p-3 sm:p-4 pb-3 space-y-2 flex-shrink-0 min-w-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`shrink-0 w-9 h-9 rounded-lg ${cat.bg} flex items-center justify-center`}>
            <CatIcon className={`w-[18px] h-[18px] ${cat.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <FitText
              as="h3"
              maxLines={2}
              className="block text-sm font-semibold text-foreground leading-snug"
            >
              {item.title || 'Solicitud sin título'}
            </FitText>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-fluid-xs text-muted-foreground">
              <span className="min-w-0">{cat.label}</span>
              {elapsed && (
                <span
                  className={`inline-flex items-center gap-1 min-w-0 ${overdue ? 'text-red-600 font-medium' : ''}`}
                >
                  <Clock className="w-3 h-3 shrink-0" />
                  {elapsed}
                  {overdue && <AlertTriangle className="w-3 h-3 shrink-0" />}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <Badge variant={statusCfg.badge} size="sm" className="text-fluid-xs max-w-full">
            {statusCfg.label}
          </Badge>
          <Badge variant={priorityCfg.badge} size="sm" className="text-fluid-xs max-w-full">
            {priorityCfg.label}
          </Badge>
        </div>
      </div>

      <div className="px-3 sm:px-4 py-2.5 border-t border-border/30 space-y-1.5 text-fluid-xs text-muted-foreground flex-1 min-w-0">
        <div className="flex items-start gap-2 min-w-0">
          <User className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {item.assigned_user_id ? (
            <span className="min-w-0 flex-1">{assignee || 'Veterinario asignado'}</span>
          ) : (
            <span className="min-w-0 flex-1 text-amber-700 dark:text-amber-500 font-medium">Pendiente de asignación</span>
          )}
        </div>
        {item.requested_at && (
          <div className="flex items-start gap-2 min-w-0">
            <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1">{formatDateLong(item.requested_at)}</span>
          </div>
        )}
        <div className="flex items-start gap-2 min-w-0">
          <MessageCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="min-w-0 flex-1">{item.resolution_notes ? 'Respuesta del veterinario disponible' : 'Sin respuestas aún'}</span>
        </div>
      </div>

      {!item.assigned_user_id && (
        <div className="px-3 sm:px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800/30 min-w-0">
          <div className="flex items-start gap-2 text-fluid-xs text-amber-800 dark:text-amber-300 min-w-0">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1">
              Un veterinario responde en máximo 48 horas. Si es urgente, llama al{' '}
              <strong className="whitespace-nowrap">{CONTACT_PHONE}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="px-3 sm:px-4 py-2 border-t border-border/30 flex flex-wrap items-center gap-1 justify-end bg-muted/30 min-w-0">
        <button
          onClick={() => onDetail(item)}
          data-compact
          className="text-fluid-xs font-medium text-primary hover:text-primary/80 px-2.5 py-1.5 rounded-lg hover:bg-primary/5 transition-colors whitespace-nowrap"
        >
          Ver detalle
        </button>
        {onCancel && item.status === 'open' && (
          <button
            onClick={() => onCancel(item)}
            data-compact
            className="text-fluid-xs font-medium text-destructive hover:text-destructive/80 px-2.5 py-1.5 rounded-lg hover:bg-destructive/5 transition-colors whitespace-nowrap"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
});

AssistanceCard.displayName = 'AssistanceCard';
