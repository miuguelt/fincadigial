/**
 * statusBadgeClasses — Mapa de clases CSS semánticas para badges de estado.
 * 
 * Cumple WCAG AA (contraste ≥ 4.5:1) en light y dark mode.
 * Usa tokens del sistema de temas en lugar de colores hardcodeados.
 * 
 * @example
 * import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
 * <Badge className={getStatusBadgeClass('success')}>Positivo</Badge>
 * <Badge className={getStatusBadgeClass('danger')}>Negativo</Badge>
 */

export type BadgeStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

/**
 * Clases semánticas WCAG AA para cada estado.
 * Patrón: fondo claro + texto oscuro + borde sutil → contraste ≥ 4.5:1
 */
const statusClasses: Record<BadgeStatus, string> = {
  success:
    'bg-success-100 text-success-800 border border-success-300 ' +
    'dark:bg-success-900 dark:text-success-100 dark:border-success-700',
  warning:
    'bg-warning-100 text-warning-800 border border-warning-300 ' +
    'dark:bg-warning-900 dark:text-warning-100 dark:border-warning-700',
  danger:
    'bg-danger-100 text-danger-800 border border-danger-300 ' +
    'dark:bg-danger-900 dark:text-danger-100 dark:border-danger-700',
  info:
    'bg-info-100 text-info-800 border border-info-300 ' +
    'dark:bg-info-900 dark:text-info-100 dark:border-info-700',
  neutral:
    'bg-neutral-100 text-neutral-700 border border-neutral-300 ' +
    'dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600',
  primary:
    'bg-primary-100 text-primary-800 border border-primary-300 ' +
    'dark:bg-primary-900 dark:text-primary-100 dark:border-primary-700',
};

/**
 * Retorna las clases CSS para un badge de estado WCAG AA.
 */
export function getStatusBadgeClass(status: BadgeStatus): string {
  return statusClasses[status] || statusClasses.neutral;
}

/**
 * Mapeo de valores comunes a estados semánticos.
 * Útil para renderizar badges automáticamente según el valor del dato.
 */
const valueToStatusMap: Record<string, BadgeStatus> = {
  // Reproducción — diagnósticos
  'Positivo': 'success',
  'Negativo': 'danger',
  'Pendiente': 'warning',
  // Eventos reproductivos del calendario
  'Celo': 'warning',
  'Inseminacion': 'info',
  'Inseminación': 'info',
  'Diagnostico': 'primary',
  'Diagnóstico': 'primary',
  'Parto': 'success',
  'Parto_Pendiente': 'danger',
  'Parto Pendiente': 'danger',
  // Prioridades (alertas de celo, sistemas de alerta)
  'Alta': 'danger',
  'Media': 'warning',
  'Baja': 'info',
  // Prioridades ICA
  'ok': 'success',
  'due_soon': 'warning',
  'missing': 'warning',
  'overdue': 'danger',
  // Cumplimiento ICA (overall)
  'green': 'success',
  'yellow': 'warning',
  'red': 'danger',
  // Estados de salud animal
  'Excelente': 'success',
  'Sano': 'success',
  'Bueno': 'success',
  'Regular': 'warning',
  'Malo': 'danger',
  'En tratamiento': 'info',
  'Enfermo': 'danger',
  // Estados generales
  'Activo': 'success',
  'Inactivo': 'neutral',
  'En Progreso': 'info',
  'Completado': 'success',
  'Cancelado': 'danger',
  'Crítico': 'danger',
  'Normal': 'success',
  'Alerta': 'warning',
  // Calificaciones
  'A': 'success',
  'B': 'info',
  'C': 'warning',
  'D': 'danger',
  // Online/Offline
  'Online': 'success',
  'Offline': 'danger',
  'Conectado': 'success',
  'Desconectado': 'danger',
};

/**
 * Auto-detecta el estado semántico de un valor y retorna las clases CSS.
 * Fallback a 'neutral' si no se reconoce el valor.
 * 
 * @example
 * <Badge className={getAutoStatusClass('Positivo')}>Positivo</Badge>
 */
export function getAutoStatusClass(value: string): string {
  const status = valueToStatusMap[value] || 'neutral';
  return statusClasses[status];
}

export default getStatusBadgeClass;
