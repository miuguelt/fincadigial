/**
 * Global constants for the VillaLuz application.
 * Following the rule of maximum 200 lines per file.
 */

export const CHART_COLORS = {
  active: '#10b981',     // green-500
  inactive: '#ef4444',   // red-500
  warning: '#f59e0b',    // amber-500
  info: '#3b82f6',       // blue-500
  success: '#10b981',    // green-500
  neutral: '#6b7280',    // gray-500
} as const;

export const STATUS_LABELS = {
  active: 'Activos',
  inactive: 'Inactivos',
  available: 'Disponibles',
  occupied: 'Ocupados',
  maintenance: 'Mantenimiento',
  restricted: 'Restringidos',
  completed: 'Completados',
  pending: 'Pendientes',
  expired: 'Vencidos',
  low_stock: 'Stock Bajo',
} as const;

export const API_ENDPOINTS = {
  USERS: '/users',
  ANIMALS: '/animals',
  FIELDS: '/fields',
  FINANCES: '/finanzas',
  PRODUCTION: '/production',
  INVENTORY: '/inventory',
} as const;

export const DATE_FORMATS = {
  COLOMBIA_ISO: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY: 'DD/MM/YYYY',
} as const;

