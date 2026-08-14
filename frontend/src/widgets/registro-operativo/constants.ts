import type { ActivityConfig } from './types';

export const ACTIVITY_TYPES: ActivityConfig[] = [
  { value: 'sowing', label: 'Siembra', emoji: '🌱', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  { value: 'irrigation', label: 'Riego', emoji: '💧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  { value: 'fertilization', label: 'Fertilización', emoji: '🧪', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  { value: 'pest_control', label: 'Control Plagas', emoji: '🐛', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  { value: 'harvest', label: 'Cosecha', emoji: '🌾', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  { value: 'note', label: 'Nota/Observación', emoji: '📋', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200', border: 'border-gray-300 dark:border-gray-700' },
];

export const DEFAULT_ACTIVITY = ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];

export function getActivityCfg(type?: string): ActivityConfig {
  return ACTIVITY_TYPES.find(t => t.value === type) ?? DEFAULT_ACTIVITY;
}

/**
 * Categorías financieras. Los `value` deben coincidir exactamente con el enum
 * `TransactionCategory` del backend (app/models/financial.py); cualquier otro
 * valor es rechazado por la validación y la transacción no se guarda.
 * `hint` traduce la categoría al lenguaje del campo.
 */
export interface FinanceCategory {
  value: string;
  label: string;
  emoji: string;
  hint: string;
}

export const CATEGORIAS_INGRESO: FinanceCategory[] = [
  { value: 'Venta de Leche', label: 'Venta de Leche', emoji: '🥛', hint: 'Leche entregada a la ruta, al acopio o vendida en la vereda.' },
  { value: 'Venta de Animal', label: 'Venta de Animal', emoji: '🐄', hint: 'Novillos, vacas de descarte, terneros.' },
  { value: 'Venta de Queso', label: 'Venta de Queso', emoji: '🧀', hint: 'Queso, cuajada y demás derivados de la leche.' },
  { value: 'Venta de Cosecha', label: 'Venta de Cosecha', emoji: '🌾', hint: 'Maíz, plátano, café, hortalizas y lo que salga del cultivo.' },
  { value: 'Otros', label: 'Otros ingresos', emoji: '📦', hint: 'Arriendo de potrero, jornales que le pagaron, ventas sueltas.' },
];

export const CATEGORIAS_GASTO: FinanceCategory[] = [
  { value: 'Alimento', label: 'Alimento del ganado', emoji: '🌾', hint: 'Concentrado, sal, melaza, heno, silo.' },
  { value: 'Insumos Agrícolas', label: 'Insumos agrícolas', emoji: '🌱', hint: 'Abonos, semillas, herbicidas, fungicidas.' },
  { value: 'Medicamentos', label: 'Medicamentos', emoji: '💊', hint: 'Drogas, vacunas, purgantes, garrapaticidas.' },
  { value: 'Servicios Veterinarios', label: 'Veterinario', emoji: '🩺', hint: 'Visitas del veterinario, inseminación, palpación.' },
  { value: 'Mano de Obra', label: 'Mano de obra', emoji: '👷', hint: 'Jornales, obreros contratados, ordeñador.' },
  { value: 'Transporte', label: 'Transporte', emoji: '🚚', hint: 'Flete de animales, acarreo de leche, gasolina, pasajes.' },
  { value: 'Mantenimiento', label: 'Mantenimiento', emoji: '🔧', hint: 'Cercas, corrales, herramienta, bomba, arreglos de la finca.' },
  { value: 'Otros', label: 'Otros gastos', emoji: '📦', hint: 'Cualquier salida que no encaje en las anteriores.' },
];

export function getFinanceCategories(type: 'Ingreso' | 'Gasto'): FinanceCategory[] {
  return type === 'Ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;
}

/**
 * `frequency` es obligatorio en el modelo `Treatments` del backend.
 */
export const TREATMENT_FREQUENCIES = [
  'Dosis única',
  'Cada 12 horas',
  'Cada 24 horas',
  'Cada 3 días',
  'Una vez por semana',
] as const;

export const HEALTH_STATUS_OPTIONS = ['Excelente', 'Bueno', 'Regular', 'Malo', 'Sano'] as const;

export const DISEASE_STATUS_OPTIONS = ['Activo', 'En tratamiento', 'Recuperado'] as const;
