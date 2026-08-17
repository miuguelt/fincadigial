/**
 * Catálogo visual del buscador: cómo se llama, con qué icono y en qué color se
 * muestra cada cosa que la finca puede devolver, y a dónde llevan los accesos
 * directos cuando todavía no se ha escrito nada.
 *
 * Vive aparte del componente porque son datos, no interfaz: añadir un tipo de
 * resultado no debería obligar a abrir el archivo que maneja foco, teclado y
 * posicionamiento del desplegable.
 */
import type { ElementType } from 'react';
import {
  CheckSquare,
  HeartPulse,
  MapPin,
  Pill,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Tag,
} from 'lucide-react';
import type { SearchResultType } from '@/features/search/api/semanticSearch.service';

export interface SearchTypeStyle {
  label: string;
  icon: ElementType;
  colorClass: string;
  badgeVariant: string;
}

export const TYPE_CONFIG: Record<SearchResultType, SearchTypeStyle> = {
  animal: {
    label: 'Animal',
    icon: Tag,
    colorClass: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/20',
    badgeVariant: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  field: {
    label: 'Potrero',
    icon: MapPin,
    colorClass: 'text-teal-600 bg-teal-500/10 dark:text-teal-400 dark:bg-teal-500/20',
    badgeVariant: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
  },
  treatment: {
    label: 'Tratamiento',
    icon: Stethoscope,
    colorClass: 'text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/20',
    badgeVariant: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  },
  vaccination: {
    label: 'Vacunación',
    icon: Syringe,
    colorClass: 'text-purple-600 bg-purple-500/10 dark:text-purple-400 dark:bg-purple-500/20',
    badgeVariant: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  },
  control: {
    label: 'Control Salud',
    icon: HeartPulse,
    colorClass: 'text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/20',
    badgeVariant: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  },
  task: {
    label: 'Tarea',
    icon: CheckSquare,
    colorClass: 'text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20',
    badgeVariant: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  },
  medication: {
    label: 'Medicamento',
    icon: Pill,
    colorClass: 'text-orange-600 bg-orange-500/10 dark:text-orange-400 dark:bg-orange-500/20',
    badgeVariant: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  },
  vaccine: {
    label: 'Vacuna',
    icon: ShieldCheck,
    colorClass: 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-500/20',
    badgeVariant: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
  },
};

export const FALLBACK_TYPE_STYLE: Omit<SearchTypeStyle, 'label'> = {
  icon: Tag,
  colorClass: 'text-muted-foreground bg-muted',
  badgeVariant: 'bg-muted text-muted-foreground',
};

export interface QuickShortcut {
  label: string;
  url: string;
  icon: ElementType;
  desc: string;
}

export const QUICK_SHORTCUTS: QuickShortcut[] = [
  { label: 'Ver Animales activos', url: '/admin/animals', icon: Tag, desc: 'Inventario general de ganado' },
  { label: 'Ver Potreros y Lotes', url: '/admin/fields', icon: MapPin, desc: 'Rotación y estado de pasturas' },
  { label: 'Tratamientos veterinarios', url: '/admin/treatments', icon: Stethoscope, desc: 'Historial clínico' },
  { label: 'Vacunaciones y biológicos', url: '/admin/vaccinations', icon: Syringe, desc: 'Calendario y dosis' },
  { label: 'Tareas y labores', url: '/admin/tasks', icon: CheckSquare, desc: 'Actividades de la finca' },
  { label: 'Insumos y medicamentos', url: '/admin/supplies', icon: Pill, desc: 'Inventario de farmacia' },
];
