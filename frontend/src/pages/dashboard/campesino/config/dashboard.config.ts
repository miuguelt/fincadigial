import type { ComponentType } from 'react';
import {
  BookOpen,
  CloudAlert,
  CloudSun,
  CheckSquare,
  Headset,
  Droplet,
  Leaf,
  ShoppingBag,
  Sprout,
  BarChart3,
} from 'lucide-react';
import {
  IconHealthAlert,
  IconMilk,
  IconRoute as IconRouteCattle,
  IconTag,
} from '@/shared/icons/cattle';
import { IconClipboardList } from '@/shared/ui/icons';

export type DashboardIcon = ComponentType<{ className?: string }>;

export interface QuickAction {
  id: string;
  label: string;
  sublabel: string;
  icon: DashboardIcon;
  path: string;
  color: string;
  glow: string;
  requiresOnline: boolean;
}

export interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: DashboardIcon;
  path: string;
  bg: string;
  emoji: string;
  requiresOnline: boolean;
}

export interface ToolGroup {
  title: string;
  color: string;
  border: string;
  tools: ToolItem[];
}

export interface DashboardTip {
  icon?: string;
  text: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-labor',
    label: 'Registrar trabajo',
    sublabel: 'Cultivo, ganado o gasto',
    icon: IconClipboardList,
    path: '/campesino/registro-operativo',
    color: 'from-emerald-600 to-green-700',
    glow: 'shadow-emerald-200 dark:shadow-emerald-900',
    requiresOnline: false,
  },
  {
    id: 'new-milk',
    label: 'Registrar ordeño',
    sublabel: 'Producción de hoy',
    icon: IconMilk,
    path: '/campesino/registro-operativo?modal=milk',
    color: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-200 dark:shadow-amber-900',
    requiresOnline: false,
  },
  {
    id: 'health-alert',
    label: 'Reportar novedad',
    sublabel: 'Salud de un animal',
    icon: IconHealthAlert,
    path: '/campesino/health',
    color: 'from-rose-500 to-red-600',
    glow: 'shadow-rose-200 dark:shadow-rose-900',
    requiresOnline: false,
  },
  {
    id: 'technical-help',
    label: 'Pedir ayuda técnica',
    sublabel: 'Habla con un especialista',
    icon: Headset,
    path: '/campesino/technical-assistance?sos=1',
    color: 'from-sky-600 to-blue-700',
    glow: 'shadow-sky-200 dark:shadow-sky-900',
    requiresOnline: true,
  },
];

export const TOOL_GROUPS: ToolGroup[] = [
  {
    title: 'Trabajo con el ganado',
    color: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    tools: [
      { id: 'stats', title: 'Estadísticas del ganado', description: 'Termómetro de salud, pesajes y engorde (ADG)', icon: BarChart3, path: '/campesino/estadisticas', bg: 'bg-gradient-to-br from-teal-50/70 to-emerald-100/30 dark:from-teal-950/20 dark:to-emerald-900/10 border-teal-200/60 dark:border-teal-800/40 hover:border-teal-300 dark:hover:border-teal-700', emoji: '📊', requiresOnline: false },
      { id: 'health', title: 'Salud animal', description: 'Novedades, tratamientos y botiquín', icon: IconHealthAlert, path: '/campesino/health', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700', emoji: '🩺', requiresOnline: false },
      { id: 'milk', title: 'Registrar ordeño', description: 'Litros de leche de la mañana o la tarde', icon: IconMilk, path: '/campesino/registro-operativo?modal=milk', bg: 'bg-gradient-to-br from-amber-50/70 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/60 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700', emoji: '🥛', requiresOnline: false },
      { id: 'transfer', title: 'Trasladar ganado', description: 'Mover lote de animales entre potreros', icon: IconRouteCattle, path: '/campesino/registro-operativo?modal=transfer', bg: 'bg-gradient-to-br from-orange-50/70 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200/60 dark:border-orange-800/40 hover:border-orange-300 dark:hover:border-orange-700', emoji: '🔄', requiresOnline: false },
      { id: 'registro', title: 'Registro diario', description: 'Anotar labores de campo, ganado y cuentas', icon: IconClipboardList, path: '/campesino/registro-operativo', bg: 'bg-surface border-border hover:border-primary', emoji: '📋', requiresOnline: false },
    ],
  },
  {
    title: 'Cultivos y agua',
    color: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800/40',
    tools: [
      { id: 'plots', title: 'Parcelas y cultivos', description: 'Manejar lotes de siembra y cosechas', icon: Sprout, path: '/campesino/crop-plots', bg: 'bg-gradient-to-br from-green-50/70 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700', emoji: '🌱', requiresOnline: false },
      { id: 'crop-activities', title: 'Labores de cultivo', description: 'Siembra, desyerbe, riego y abono', icon: Leaf, path: '/campesino/crop-activities', bg: 'bg-gradient-to-br from-lime-50/70 to-lime-100/30 dark:from-lime-950/20 dark:to-lime-900/10 border-lime-200/60 dark:border-lime-800/40 hover:border-lime-300 dark:hover:border-lime-700', emoji: '🌿', requiresOnline: false },
      { id: 'water', title: 'Fuentes de agua', description: 'Quebradas, reservorios y bebederos', icon: Droplet, path: '/campesino/water-sources', bg: 'bg-gradient-to-br from-cyan-50/70 to-cyan-100/30 dark:from-cyan-950/20 dark:to-cyan-900/10 border-cyan-200/60 dark:border-cyan-800/40 hover:border-cyan-300 dark:hover:border-cyan-700', emoji: '💧', requiresOnline: false },
    ],
  },
  {
    title: 'Clima y apoyo',
    color: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/40',
    tools: [
      { id: 'scanner', title: 'Escanear chapeta', description: 'Identificar animal por su orejera', icon: IconTag, path: '/scanner', bg: 'bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700', emoji: '🏷️', requiresOnline: false },
      { id: 'tasks', title: 'Agenda de tareas', description: 'Labores y trabajos asignados para hoy', icon: CheckSquare, path: '/operario/tasks', bg: 'bg-gradient-to-br from-sky-50/70 to-sky-100/30 dark:from-sky-950/20 dark:to-sky-900/10 border-sky-200/60 dark:border-sky-800/40 hover:border-sky-300 dark:hover:border-sky-700', emoji: '📅', requiresOnline: false },
      { id: 'weather', title: 'Estación de clima', description: 'Pronóstico de lluvia y temperatura local', icon: CloudSun, path: '/campesino/weather', bg: 'bg-gradient-to-br from-blue-50/70 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700', emoji: '🌤️', requiresOnline: false },
      { id: 'alerts', title: 'Alertas de clima', description: 'Avisos de helada, sequía y vendaval', icon: CloudAlert, path: '/campesino/climate-alerts', bg: 'bg-gradient-to-br from-slate-50/70 to-slate-100/30 dark:from-slate-900/20 dark:to-slate-850/10 border-slate-200/60 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-750', emoji: '⛈️', requiresOnline: true },
      { id: 'market', title: 'Mercado campesino', description: 'Vender o comprar productos de la región', icon: ShoppingBag, path: '/campesino/market-offers', bg: 'bg-gradient-to-br from-fuchsia-50/70 to-fuchsia-100/30 dark:from-fuchsia-950/20 to-fuchsia-900/10 border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:border-fuchsia-300 dark:hover:border-fuchsia-700', emoji: '🏪', requiresOnline: true },
      { id: 'assistance', title: 'Ayuda técnica', description: 'Consultar con el veterinario o agrónomo', icon: Headset, path: '/campesino/technical-assistance', bg: 'bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/20 to-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700', emoji: '👨‍🌾', requiresOnline: true },
      { id: 'learning', title: 'Aprender sin conexión', description: 'Cartillas y manuales prácticos para el campo', icon: BookOpen, path: '/campesino/aprender', bg: 'bg-gradient-to-br from-violet-50/70 to-violet-100/30 dark:from-violet-950/20 dark:to-violet-900/10 border-violet-200/60 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-700', emoji: '📖', requiresOnline: false },
    ],
  },
];

export const TIPS_FALLBACK: DashboardTip[] = [
  { icon: '📱', text: 'Usa la app sin internet. Los datos se sincronizan cuando vuelva la señal.' },
  { icon: '🌱', text: 'Registra tus labores diarias para llevar trazabilidad de tu finca.' },
];
