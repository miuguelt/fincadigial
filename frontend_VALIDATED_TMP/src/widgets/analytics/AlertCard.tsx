import React from 'react';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// El backend envía `priority` en español; el frontend legacy usaba `severity` en inglés.
// Este componente acepta ambos y normaliza internamente.
export interface AlertCardData {
  id?: string | number;
  type?: string;
  title: string;
  message: string;
  // Prioridad del backend (español)
  priority?: 'Crítica' | 'Alta' | 'Media' | 'Baja' | string;
  // Severidad legada (inglés)
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
  icon: React.FC<{ className?: string }>;
  bgColor: string;
  borderColor: string;
  textColor: string;
  buttonColor: string;
}> = {
  critical: {
    icon: XCircleIcon as any,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    textColor: 'text-red-800',
    buttonColor: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: ExclamationTriangleIcon as any,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-800',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  info: {
    icon: InformationCircleIcon as any,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-800',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  success: {
    icon: CheckCircleIcon as any,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    textColor: 'text-green-800',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
};

function resolveSeverity(alert: AlertCardData): SeverityKey {
  // Si viene severity directo (legado), usarlo
  if (alert.severity && alert.severity in severityConfig) {
    return alert.severity as SeverityKey;
  }
  // Mapear priority del backend (español) a severity
  const p = (alert.priority || '').toLowerCase();
  if (p === 'crítica' || p === 'critica') return 'critical';
  if (p === 'alta')   return 'warning';
  if (p === 'media')  return 'info';
  if (p === 'baja')   return 'success';
  return 'info';
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onAction }) => {
  const sev    = resolveSeverity(alert);
  const config = severityConfig[sev];
  const Icon   = config.icon;

  return (
    <div
      className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 rounded-r-lg hover:shadow-md transition-shadow ${alert.is_read ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${config.textColor} mt-0.5 flex-shrink-0`} />
        <div className="ml-3 flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${config.textColor}`}>
            {alert.title}
          </h3>
          <p className={`text-sm ${config.textColor} mt-1`}>{alert.message}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {alert.animal_record && (
              <span className="font-medium">Animal: {alert.animal_record}</span>
            )}
            {alert.created_at && (
              <span>{new Date(alert.created_at).toLocaleString('es-ES')}</span>
            )}
          </div>

          {alert.action_required && onAction && (
            <button
              onClick={() => onAction(alert)}
              className={`mt-3 px-4 py-2 text-xs font-medium text-white rounded-md ${config.buttonColor} transition-colors`}
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
