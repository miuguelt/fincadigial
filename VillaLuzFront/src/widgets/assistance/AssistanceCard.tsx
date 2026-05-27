import React from 'react';
import { User, Calendar, MessageCircle, Clock, AlertTriangle } from 'lucide-react';
import type { TechnicalAssistanceRequest } from '@/entities/campesino';
import { Badge } from '@/shared/ui/badge';
import { getCategoryConfig, STATUS_CONFIG, PRIORITY_CONFIG, CONTACT_PHONE } from './assistance.constants';
import { timeAgo, isOverdue, formatDateLong } from './timeUtils';

interface AssistanceCardProps {
  item: TechnicalAssistanceRequest;
  onDetail: (item: TechnicalAssistanceRequest) => void;
  onCancel?: (item: TechnicalAssistanceRequest) => void;
}

export const AssistanceCard = React.memo<AssistanceCardProps>(({ item, onDetail, onCancel }) => {
  const cat = getCategoryConfig(item.category || 'otro');
  const statusCfg = STATUS_CONFIG[item.status || 'open'] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;
  const CatIcon = cat.icon;
  const elapsed = timeAgo(item.requested_at);
  const overdue = !item.assigned_user_id && isOverdue(item.requested_at);

  return (
    <div className="flex flex-col h-full bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 pb-3 space-y-2 flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center`}>
            <CatIcon className={`w-5 h-5 ${cat.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                {item.title}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant={statusCfg.badge} size="sm">{statusCfg.label}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{cat.label}</span>
              {elapsed && (
                <>
                  <span>•</span>
                  <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                    <Clock className="w-3 h-3" />
                    {elapsed}
                    {overdue && <AlertTriangle className="w-3 h-3" />}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={priorityCfg.badge} size="sm">{priorityCfg.label}</Badge>
        </div>
      </div>

      <div className="px-4 py-2.5 border-t border-border/30 space-y-1.5 text-xs text-muted-foreground flex-1">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 shrink-0" />
          {item.assigned_user_id ? (
            <span>{(item as any).assignee?.name || (item as any).assignee?.username || 'Técnico asignado'}</span>
          ) : (
            <span className="text-amber-600 font-medium">Pendiente de asignación</span>
          )}
        </div>
        {item.requested_at && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{formatDateLong(item.requested_at)}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{item.resolution_notes ? 'Respuesta del técnico disponible' : 'Sin respuestas aún'}</span>
        </div>
      </div>

      {!item.assigned_user_id && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800/30">
          <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Tu solicitud está siendo revisada. Un técnico se comunicará contigo en máximo 48 horas. Si es urgente, llama al: <strong>{CONTACT_PHONE}</strong></span>
          </div>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-border/30 flex items-center gap-2 justify-end bg-muted/30">
        <button
          onClick={() => onDetail(item)}
          className="text-xs font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
        >
          Ver detalle
        </button>
        {onCancel && item.status === 'open' && (
          <button
            onClick={() => onCancel(item)}
            className="text-xs font-medium text-destructive hover:text-destructive/80 px-3 py-1.5 rounded-lg hover:bg-destructive/5 transition-colors"
          >
            Cancelar solicitud
          </button>
        )}
      </div>
    </div>
  );
});

AssistanceCard.displayName = 'AssistanceCard';
