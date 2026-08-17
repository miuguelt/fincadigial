import { memo } from 'react';
import { Clock, ExternalLink, Check, X, Sparkles, MapPin, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { typeIcons, priorityConfig } from './alertCard.constants';

export interface AlertCardData {
  id: string | number;
  type: string;
  priority: string;
  message: string;
  recommendation?: string;
  triggered_at?: string;
  is_read: boolean;
  animal_name?: string;
  animal_record?: string;
  field_name?: string;
  action_url?: string;
  action_label?: string;
}

interface AlertNotificationCardProps {
  alert: AlertCardData;
  onMarkRead?: (id: string | number) => void;
  onDismiss?: (id: string | number) => void;
  onAction?: (alert: AlertCardData) => void;
}

export const AlertNotificationCard = memo(function AlertNotificationCard({
  alert,
  onMarkRead,
  onDismiss,
  onAction,
}: AlertNotificationCardProps) {
  const Icon = typeIcons[alert.type] || typeIcons.Estado;
  const priority = priorityConfig[alert.priority] || priorityConfig.Media;
  const timeStr = alert.triggered_at
    ? formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true, locale: es })
    : '';

  const isUnread = !alert.is_read;

  return (
    <div
      className={cn(
        'group relative rounded-lg border transition-all duration-300 overflow-hidden',
        isUnread
          ? cn(priority.border, priority.bg, 'shadow-sm hover:shadow-md')
          : 'border-border/40 bg-card/50',
        'hover:-translate-y-0.5',
      )}
    >
      {/* Barra lateral de prioridad */}
      {isUnread && (
        <div className={cn(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl',
          priority.badge
        )} />
      )}

      {/* Header de la tarjeta */}
      <div className={cn(
        'flex items-center justify-between px-4 pl-5 py-2.5 border-b',
        isUnread ? cn(priority.border, 'bg-black/[0.02] dark:bg-card/[0.02]') : 'border-border/20'
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {/* Badge de prioridad */}
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0',
            priority.badge, 'text-white shadow-sm'
          )}>
            {priority.pulse && (
              <span className="flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-card/80 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-card" />
              </span>
            )}
            {priority.label}
          </span>

          {/* Tipo de alerta */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
            'bg-black/5 dark:bg-card/10',
            priority.color
          )}>
            <Icon className="h-3 w-3" />
            {alert.type}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {timeStr && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeStr}
            </span>
          )}
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_4px_var(--color-primary)]" />
          )}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* Ícono del tipo */}
          <div className={cn(
            'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm',
            priority.badge, 'text-white',
            !isUnread && 'opacity-50'
          )}>
            <Icon className="h-4.5 w-4.5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm leading-relaxed whitespace-normal break-words',
              isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}>
              {alert.message}
            </p>

            {/* Metadata del animal / potrero */}
            {(alert.animal_record || alert.animal_name) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {alert.animal_record && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground border border-border/40">
                    <Tag className="h-2.5 w-2.5" />
                    {alert.animal_record}
                    {alert.animal_name && <span className="text-muted-foreground">· {alert.animal_name}</span>}
                  </span>
                )}
                {alert.field_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground border border-border/40">
                    <MapPin className="h-2.5 w-2.5" />
                    {alert.field_name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recomendación IA */}
        {alert.recommendation && (
          <div className={cn(
            'mt-3 p-3 rounded-xl border',
            'bg-gradient-to-r from-violet-50/80 to-purple-50/80 dark:from-violet-950/30 dark:to-purple-950/30',
            'border-violet-200/60 dark:border-violet-800/50'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20">
                <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                Recomendación IA
              </span>
            </div>
            <p className="text-xs text-violet-900 dark:text-violet-200 leading-relaxed pl-7">
              {alert.recommendation}
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/20">
          {isUnread && onMarkRead && (
            <button
              onClick={() => onMarkRead(alert.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                'transition-all duration-200',
                'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'
              )}
            >
              <Check className="h-3.5 w-3.5" />
              Marcar leída
            </button>
          )}
          {alert.action_url && onAction && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 rounded-lg"
              onClick={() => onAction(alert)}
            >
              <ExternalLink className="h-3 w-3" />
              {alert.action_label || 'Ver detalle'}
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(alert.id)}
              className={cn(
                'ml-auto p-1.5 rounded-lg text-muted-foreground',
                'hover:text-foreground hover:bg-muted transition-all duration-200',
                'opacity-0 group-hover:opacity-100'
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default AlertNotificationCard;
