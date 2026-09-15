import { Sprout, PawPrint, Bug, Droplets, Wrench, HelpCircle, LucideIcon } from 'lucide-react';
import type { BadgeVariant } from '@/shared/ui/badge';

export interface CategoryConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  chipBg: string;
}

export interface StatusConfigItem {
  label: string;
  badge: BadgeVariant;
  color: string;
  borderColor: string;
  accentBg: string;
  tagColor: string;
}

export interface PriorityConfigItem {
  label: string;
  badge: BadgeVariant;
  color: string;
  dotColor: string;
  borderColor: string;
  level: number;
}

export const CATEGORIES: CategoryConfig[] = [
  {
    value: 'pecuario',
    label: 'Animales',
    icon: PawPrint,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950/50',
    border: 'border-amber-300 dark:border-amber-700/60',
    chipBg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40',
  },
  {
    value: 'agricola',
    label: 'Cultivos',
    icon: Sprout,
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-950/50',
    border: 'border-emerald-300 dark:border-emerald-700/60',
    chipBg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40',
  },
  {
    value: 'plagas',
    label: 'Plagas y Sanidad',
    icon: Bug,
    color: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-950/50',
    border: 'border-rose-300 dark:border-rose-700/60',
    chipBg: 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/40',
  },
  {
    value: 'suelos_agua',
    label: 'Suelos y Agua',
    icon: Droplets,
    color: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-950/50',
    border: 'border-sky-300 dark:border-sky-700/60',
    chipBg: 'bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/40',
  },
  {
    value: 'maquinaria',
    label: 'Maquinaria',
    icon: Wrench,
    color: 'text-indigo-700 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-950/50',
    border: 'border-indigo-300 dark:border-indigo-700/60',
    chipBg: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/40',
  },
  {
    value: 'otro',
    label: 'Otro',
    icon: HelpCircle,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    border: 'border-slate-300 dark:border-slate-700/60',
    chipBg: 'bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800/40',
  },
];

export function getCategoryConfig(value: string): CategoryConfig {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[5];
}

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  open: {
    label: 'Esperando veterinario',
    badge: 'warning',
    color: 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800/60',
    borderColor: 'border-l-amber-500',
    accentBg: 'bg-amber-500/5',
    tagColor: 'text-amber-700 dark:text-amber-400',
  },
  in_progress: {
    label: 'Veterinario asignado',
    badge: 'info',
    color: 'text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/50 border-sky-300 dark:border-sky-800/60',
    borderColor: 'border-l-sky-500',
    accentBg: 'bg-sky-500/5',
    tagColor: 'text-sky-700 dark:text-sky-400',
  },
  resolved: {
    label: 'Caso resuelto',
    badge: 'success',
    color: 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800/60',
    borderColor: 'border-l-emerald-500',
    accentBg: 'bg-emerald-500/5',
    tagColor: 'text-emerald-700 dark:text-emerald-400',
  },
  closed: {
    label: 'Cancelada',
    badge: 'neutral',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700/60',
    borderColor: 'border-l-slate-400 dark:border-l-slate-600',
    accentBg: 'bg-slate-500/5',
    tagColor: 'text-slate-600 dark:text-slate-400',
  },
};

export const PRIORITY_CONFIG: Record<string, PriorityConfigItem> = {
  critical: {
    label: 'Crítica',
    badge: 'destructive',
    color: 'text-rose-900 dark:text-rose-200 bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-600',
    borderColor: 'border-l-rose-600',
    level: 3,
  },
  high: {
    label: 'Muy urgente',
    badge: 'destructive',
    color: 'text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
    dotColor: 'bg-rose-500',
    borderColor: 'border-l-rose-500',
    level: 2,
  },
  medium: {
    label: 'Esta semana',
    badge: 'warning',
    color: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50',
    dotColor: 'bg-amber-500',
    borderColor: 'border-l-amber-500',
    level: 1,
  },
  low: {
    label: 'Cuando puedan',
    badge: 'neutral',
    color: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50',
    dotColor: 'bg-emerald-500',
    borderColor: 'border-l-slate-400',
    level: 0,
  },
};

export const PRIORITY_OPTIONS = [
  {
    value: 'high',
    label: 'Muy urgente — necesito ayuda hoy',
    icon: '🔴',
    desc: 'Animal enfermo de gravedad, intoxicación o urgencia.',
  },
  {
    value: 'medium',
    label: 'Esta semana',
    icon: '🟡',
    desc: 'Revisión periódica o inquietud de manejo general.',
  },
  {
    value: 'low',
    label: 'Cuando puedan',
    icon: '🟢',
    desc: 'Consultas no urgentes o planeación de mejoras.',
  },
];

export const STATUS_LABELS: Record<string, string> = {
  open: 'Esperando veterinario',
  in_progress: 'En atención',
  resolved: 'Resuelta',
  closed: 'Cancelada',
};
