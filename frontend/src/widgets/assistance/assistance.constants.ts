import { Sprout, PawPrint, Bug, Droplets, Wrench, HelpCircle } from 'lucide-react';
import type { BadgeVariant } from '@/shared/ui/badge';

export interface CategoryConfig {
  value: string; label: string; icon: any; color: string; bg: string; border: string;
}

export interface StatusConfigItem {
  label: string; badge: BadgeVariant; color: string;
}

export interface PriorityConfigItem {
  label: string; badge: BadgeVariant; color: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { value: 'agricola', label: 'Cultivos', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-700' },
  { value: 'pecuario', label: 'Animales', icon: PawPrint, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700' },
  { value: 'plagas', label: 'Plagas y enfermedades', icon: Bug, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700' },
  { value: 'suelos_agua', label: 'Suelos y agua', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700' },
  { value: 'maquinaria', label: 'Maquinaria', icon: Wrench, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800/30', border: 'border-gray-300 dark:border-gray-600' },
  { value: 'otro', label: 'Otro', icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800/30', border: 'border-slate-300 dark:border-slate-600' },
];

export function getCategoryConfig(value: string) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[5];
}

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  open: { label: 'Esperando veterinario', badge: 'warning', color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30' },
  in_progress: { label: 'Veterinario asignado', badge: 'info', color: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30' },
  resolved: { label: 'Resuelta', badge: 'success', color: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30' },
  closed: { label: 'Cancelada', badge: 'neutral', color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800/30' },
};

export const PRIORITY_CONFIG: Record<string, PriorityConfigItem> = {
  low: { label: 'Baja', badge: 'neutral', color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800/30' },
  medium: { label: 'Media', badge: 'warning', color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30' },
  high: { label: 'Alta', badge: 'destructive', color: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30' },
  critical: { label: 'Crítica', badge: 'destructive', color: 'text-red-900 bg-red-200 dark:text-red-200 dark:bg-red-950/50' },
};

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'Muy urgente — necesito ayuda hoy', icon: '🔴' },
  { value: 'medium', label: 'Esta semana', icon: '🟡' },
  { value: 'low', label: 'Cuando puedan', icon: '🟢' },
];

export const STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En Proceso',
  resolved: 'Resuelta',
  closed: 'Cerrada',
};

export const CONTACT_PHONE = '+57 314 000 0000';
