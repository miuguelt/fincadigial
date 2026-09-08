import type { ComponentType } from 'react';
import { Milk, Baby, Scissors, TrendingDown } from 'lucide-react';

export interface SmartFilter {
  id: string;
  label: string;
  icon: ComponentType<any>;
  colorClass: string;
  activeColorClass: string;
  queryParam: string;
  value: any;
  tooltip: string;
  description: string;
}

export const SMART_FILTERS: SmartFilter[] = [
  {
    id: 'pregnant',
    label: 'En Gestación',
    icon: Baby,
    colorClass:
      'text-muted-foreground border-border/60 bg-card/40 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/40',
    activeColorClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/50 shadow-sm shadow-amber-500/10',
    queryParam: 'is_pregnant',
    value: 'true',
    tooltip: 'Filtras hembras con gestación activa',
    description: 'Hembras gestantes hoy',
  },
  {
    id: 'lactating',
    label: 'En Lactancia',
    icon: Milk,
    colorClass:
      'text-muted-foreground border-border/60 bg-card/40 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/40',
    activeColorClass:
      'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/50 shadow-sm shadow-blue-500/10',
    queryParam: 'is_lactating',
    value: 'true',
    tooltip: 'Filtra hembras en producción de leche',
    description: 'Hembras produciendo leche',
  },
  {
    id: 'destetar',
    label: 'Para Destete',
    icon: Scissors,
    colorClass:
      'text-muted-foreground border-border/60 bg-card/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500/40',
    activeColorClass:
      'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/50 shadow-sm shadow-violet-500/10',
    queryParam: 'destetar',
    value: 'true',
    tooltip: 'Terneros de 7 a 8 meses a punto de destetar',
    description: 'Terneros de 7-8 meses listos para destetar',
  },
  {
    id: 'bajo_peso',
    label: 'Bajo Peso',
    icon: TrendingDown,
    colorClass:
      'text-muted-foreground border-border/60 bg-card/40 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/40',
    activeColorClass:
      'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/50 shadow-sm shadow-red-500/10',
    queryParam: 'bajo_peso',
    value: 'true',
    tooltip: 'Animales por debajo del peso estándar de su raza y edad',
    description: 'Bajo el peso estándar de su raza y edad',
  },
];

export const FILTER_ACCENTS: Record<string, string> = {
  pregnant: 'text-amber-600 dark:text-amber-400 bg-amber-500/15',
  lactating: 'text-blue-600 dark:text-blue-400 bg-blue-500/15',
  destetar: 'text-violet-600 dark:text-violet-400 bg-violet-500/15',
  bajo_peso: 'text-red-600 dark:text-red-400 bg-red-500/15',
};
