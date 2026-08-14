import { AlertTriangle, XCircle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface AlertCardData {
  id?: string | number;
  type?: string;
  title: string;
  message: string;
  priority?: string;
  severity?: 'critical' | 'warning' | 'info' | 'success';
  action_required?: string;
  created_at?: string;
  animal_record?: string;
  is_read?: boolean;
}

interface AlertCardProps {
  alert: AlertCardData;
  onAction?: (alert: AlertCardData) => void;
}

type SeverityKey = 'critical' | 'warning' | 'info' | 'success';

const severityConfig: Record<SeverityKey, {
  icon: React.ElementType;
  bgColor: string;
  borderColor: string;
  textColor: string;
  buttonColor: string;
}> = {
  critical: {
    icon: XCircle,
    bgColor: 'bg-destructive/5 dark:bg-red-950/20',
    borderColor: 'border-destructive',
    textColor: 'text-destructive dark:text-red-300',
    buttonColor: 'bg-destructive hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-800 dark:text-orange-300',
    buttonColor: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
  info: {
    icon: Info,
    bgColor: 'bg-info/5 dark:bg-blue-950/20',
    borderColor: 'border-info',
    textColor: 'text-info dark:text-blue-300',
    buttonColor: 'bg-info hover:bg-blue-700 text-white',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-success/5 dark:bg-green-950/20',
    borderColor: 'border-success',
    textColor: 'text-success dark:text-green-300',
    buttonColor: 'bg-success hover:bg-green-700 text-white',
  },
};

function resolveSeverity(alert: AlertCardData): SeverityKey {
  if (alert.severity && alert.severity in severityConfig) {
    return alert.severity as SeverityKey;
  }
  const p = (alert.priority || '').toLowerCase();
  if (p === 'crítica' || p === 'critica') return 'critical';
  if (p === 'alta') return 'warning';
  if (p === 'media') return 'info';
  if (p === 'baja') return 'success';
  return 'info';
}

const AlertCard = ({ alert, onAction }: AlertCardProps) => {
  const sev = resolveSeverity(alert);
  const config = severityConfig[sev];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        `${config.bgColor} border-l-4 ${config.borderColor} p-4 rounded-r-lg hover:shadow-md transition-shadow`,
        alert.is_read && 'opacity-60',
      )}
    >
      <div className="flex items-start">
        <Icon className={cn('w-5 h-5', config.textColor, 'mt-0.5 flex-shrink-0')} />
        <div className="ml-3 flex-1 min-w-0">
          <h3 className={cn('text-sm font-semibold', config.textColor)}>{alert.title}</h3>
          <p className={cn('text-sm', config.textColor, 'mt-1')}>{alert.message}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {alert.animal_record && <span className="font-medium">Animal: {alert.animal_record}</span>}
            {alert.created_at && <span>{new Date(alert.created_at).toLocaleString('es-CO')}</span>}
          </div>

          {alert.action_required && onAction && (
            <button
              onClick={() => onAction(alert)}
              className={cn('mt-3 px-4 py-2 text-xs font-medium rounded-md', config.buttonColor, 'transition-colors')}
            >
              {alert.action_required}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
