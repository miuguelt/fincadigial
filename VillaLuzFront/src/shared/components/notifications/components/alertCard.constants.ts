import { Heart, Baby, TrendingUp, AlertTriangle, Sparkles, Thermometer, Droplets } from 'lucide-react';

export const typeIcons: Record<string, React.ElementType> = {
  Salud: Heart,
  Reproducción: Baby,
  Crecimiento: TrendingUp,
  Estado: AlertTriangle,
  Producción: Droplets,
  Personalizada: Sparkles,
  Predictiva: Thermometer,
};

export const priorityConfig: Record<string, { color: string; bg: string; border: string; badge: string; label: string; pulse: boolean }> = {
  Crítica: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-500',
    label: 'CRÍTICA',
    pulse: true,
  },
  Alta: {
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-500',
    label: 'ALTA',
    pulse: false,
  },
  Media: {
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-500',
    label: 'MEDIA',
    pulse: false,
  },
  Baja: {
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-500',
    label: 'BAJA',
    pulse: false,
  },
};
