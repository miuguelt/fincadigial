import React from 'react';
import { Activity, Award, BookOpen, Heart } from 'lucide-react';
import type { BadgeVariant } from '@/shared/ui/badge';
import type { Course, CourseLesson } from '../model/types';

export type CourseStatus = 'completado' | 'en-progreso' | 'sin-iniciar';

export interface CourseWithProgress extends Course {
  completed: number;
  completedIds: string[];
  percentage: number;
  status: CourseStatus;
  nextLesson?: CourseLesson;
}

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  Heart,
  Activity,
  Award,
};

/** Acentos por curso: cada variante declara su versión clara y su versión oscura. */
const accentMap: Record<string, { tile: string; bar: string }> = {
  indigo: {
    tile: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/15 dark:text-indigo-300',
    bar: 'bg-indigo-500 dark:bg-indigo-400',
  },
  red: {
    tile: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/15 dark:text-rose-300',
    bar: 'bg-rose-500 dark:bg-rose-400',
  },
  emerald: {
    tile: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300',
    bar: 'bg-emerald-500 dark:bg-emerald-400',
  },
  amber: {
    tile: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300',
    bar: 'bg-amber-500 dark:bg-amber-400',
  },
};

export const statusBadge: Record<CourseStatus, { label: string; variant: BadgeVariant }> = {
  completado: { label: 'Completado', variant: 'success' },
  'en-progreso': { label: 'En progreso', variant: 'warning' },
  'sin-iniciar': { label: 'Sin iniciar', variant: 'muted' },
};

export const ctaLabel: Record<CourseStatus, string> = {
  completado: 'Repasar curso',
  'en-progreso': 'Continuar curso',
  'sin-iniciar': 'Comenzar curso',
};

/**
 * Superficie elevada de academia: borde definido y sombra en dos capas (contacto + difusa)
 * para dar profundidad sobre el fondo claro sin ensuciar el modo oscuro.
 */
export const surfaceCard =
  'border-border shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_28px_-16px_rgba(15,23,42,0.30)] ' +
  'dark:border-white/10 dark:shadow-[0_1px_2px_rgba(0,0,0,0.45),0_12px_32px_-18px_rgba(0,0,0,0.75)]';

export const getCourseIcon = (icon: string): React.ElementType => iconMap[icon] || BookOpen;

export const getCourseAccent = (color: string) => accentMap[color] || accentMap.indigo;

export const courseNumber = new Intl.NumberFormat('es-CO');
