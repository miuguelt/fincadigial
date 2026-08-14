import type { ComponentType } from 'react';
import {
  CloudAlert,
  CheckSquare,
  Headset,
  Droplet,
  Leaf,
  ShoppingBag,
  Sprout,
} from 'lucide-react';
import {
  IconHealthAlert,
  IconHealthCheck,
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

export const OFFLINE_STORAGE_KEY = 'campesino:pending_sync';

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-labor',
    label: 'Registrar Labor',
    sublabel: 'Agricultura y ganadería',
    icon: IconClipboardList,
    path: '/campesino/registro-operativo',
    color: 'from-emerald-500 to-green-600',
    glow: 'shadow-emerald-200 dark:shadow-emerald-900',
    requiresOnline: false,
  },
  {
    id: 'new-milk',
    label: 'Registrar Ordeño',
    sublabel: 'Producción diaria',
    icon: IconMilk,
    path: '/campesino/registro-operativo?modal=milk',
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-200 dark:shadow-amber-900',
    requiresOnline: false,
  },
  {
    id: 'health-alert',
    label: 'Enfermedad',
    sublabel: 'Reportar síntomas',
    icon: IconHealthAlert,
    path: '/campesino/registro-operativo?modal=disease',
    color: 'from-rose-500 to-red-600',
    glow: 'shadow-rose-200 dark:shadow-rose-900',
    requiresOnline: false,
  },
];

export const TOOL_GROUPS: ToolGroup[] = [
  {
    title: ' Registro Operativo',
    color: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    tools: [
      { id: 'registro', title: 'Registro Unificado', description: 'Agricultura, ganadería y más', icon: IconClipboardList, path: '/campesino/registro-operativo', bg: 'bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700', emoji: '📋', requiresOnline: false },
      { id: 'milk', title: 'Registrar Ordeño', description: 'Producción diaria de leche', icon: IconMilk, path: '/campesino/registro-operativo?modal=milk', bg: 'bg-gradient-to-br from-amber-50/70 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/60 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700', emoji: '', requiresOnline: false },
      { id: 'transfer', title: 'Trasladar Ganado', description: 'Mover animales entre potreros', icon: IconRouteCattle, path: '/campesino/registro-operativo?modal=transfer', bg: 'bg-gradient-to-br from-orange-50/70 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200/60 dark:border-orange-800/40 hover:border-orange-300 dark:hover:border-orange-700', emoji: '️', requiresOnline: false },
      { id: 'disease', title: 'Reportar Enfermedad', description: 'Avisar sobre animales enfermos', icon: IconHealthAlert, path: '/campesino/registro-operativo?modal=disease', bg: 'bg-gradient-to-br from-rose-50/70 to-rose-100/30 dark:from-rose-950/20 dark:to-rose-900/10 border-rose-200/60 dark:border-rose-800/40 hover:border-rose-300 dark:hover:border-rose-700', emoji: '', requiresOnline: false },
      { id: 'treatment', title: 'Aplicar Tratamiento', description: 'Registrar medicinas y vacunas', icon: IconHealthCheck, path: '/campesino/registro-operativo?modal=treatment', bg: 'bg-gradient-to-br from-purple-50/70 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/60 dark:border-purple-800/40 hover:border-purple-300 dark:hover:border-purple-700', emoji: '', requiresOnline: false },
    ],
  },
  {
    title: '🌱 Gestión de Cultivos',
    color: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800/40',
    tools: [
      { id: 'plots', title: 'Parcelas y Cultivos', description: 'Manejar lotes de cultivo', icon: Sprout, path: '/campesino/crop-plots', bg: 'bg-gradient-to-br from-green-50/70 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700', emoji: '', requiresOnline: false },
      { id: 'crop-activities', title: 'Labores de Cultivo', description: 'Siembra, riego, cosecha y plagas', icon: Leaf, path: '/campesino/crop-activities', bg: 'bg-gradient-to-br from-lime-50/70 to-lime-100/30 dark:from-lime-950/20 dark:to-lime-900/10 border-lime-200/60 dark:border-lime-800/40 hover:border-lime-300 dark:hover:border-lime-700', emoji: '', requiresOnline: false },
      { id: 'water', title: 'Fuentes de Agua', description: 'Quebradas, pozos, reservorios', icon: Droplet, path: '/campesino/water-sources', bg: 'bg-gradient-to-br from-cyan-50/70 to-cyan-100/30 dark:from-cyan-950/20 dark:to-cyan-900/10 border-cyan-200/60 dark:border-cyan-800/40 hover:border-cyan-300 dark:hover:border-cyan-700', emoji: '💧', requiresOnline: false },
    ],
  },
  {
    title: '⚙️ Servicios y Apoyo',
    color: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/40',
    tools: [
      { id: 'scanner', title: 'Escanear Chapeta', description: 'Identificar animal por orejera', icon: IconTag, path: '/scanner', bg: 'bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700', emoji: '🏷️', requiresOnline: false },
      { id: 'tasks', title: 'Agenda de Tareas', description: 'Ver qué tengo asignado hoy', icon: CheckSquare, path: '/operario/tasks', bg: 'bg-gradient-to-br from-sky-50/70 to-sky-100/30 dark:from-sky-950/20 dark:to-sky-900/10 border-sky-200/60 dark:border-sky-800/40 hover:border-sky-300 dark:hover:border-sky-700', emoji: '📅', requiresOnline: false },
      { id: 'alerts', title: 'Alertas de Clima', description: 'Heladas, sequías y avisos', icon: CloudAlert, path: '/campesino/climate-alerts', bg: 'bg-gradient-to-br from-slate-50/70 to-slate-100/30 dark:from-slate-900/20 dark:to-slate-850/10 border-slate-200/60 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-750', emoji: '⛈️', requiresOnline: true },
      { id: 'market', title: 'Mercado Campesino', description: 'Vender o comprar productos', icon: ShoppingBag, path: '/campesino/market-offers', bg: 'bg-gradient-to-br from-fuchsia-50/70 to-fuchsia-100/30 dark:from-fuchsia-950/20 to-fuchsia-900/10 border-fuchsia-200/60 dark:border-fuchsia-800/40 hover:border-fuchsia-300 dark:hover:border-fuchsia-700', emoji: '🏪', requiresOnline: true },
      { id: 'assistance', title: 'Ayuda Técnica', description: 'Solicitar asesoría', icon: Headset, path: '/campesino/technical-assistance', bg: 'bg-gradient-to-br from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/20 to-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700', emoji: '‍🌾', requiresOnline: true },
    ],
  },
];

export const TIPS_FALLBACK: DashboardTip[] = [
  { icon: '📱', text: 'Usa la app sin internet. Los datos se sincronizan cuando vuelva la señal.' },
  { icon: '🌱', text: 'Registra tus labores diarias para llevar trazabilidad de tu finca.' },
];
