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
  glow?: string;
  requiresOnline: boolean;
}

export interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: DashboardIcon;
  path: string;
  bg?: string;
  emoji?: string;
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
    sublabel: 'Cultivo, ganado o labor de campo',
    icon: IconClipboardList,
    path: '/campesino/registro-operativo',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    requiresOnline: false,
  },
  {
    id: 'new-milk',
    label: 'Registrar ordeño',
    sublabel: 'Producción de leche de hoy',
    icon: IconMilk,
    path: '/campesino/registro-operativo?modal=milk',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    requiresOnline: false,
  },
  {
    id: 'health-alert',
    label: 'Reportar novedad',
    sublabel: 'Síntoma o sanidad de animal',
    icon: IconHealthAlert,
    path: '/campesino/health',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    requiresOnline: false,
  },
  {
    id: 'technical-help',
    label: 'Pedir ayuda técnica',
    sublabel: 'Asistencia con especialista',
    icon: Headset,
    path: '/campesino/technical-assistance?sos=1',
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    requiresOnline: true,
  },
];

export const TOOL_GROUPS: ToolGroup[] = [
  {
    title: 'Trabajo con el ganado',
    color: 'text-primary',
    border: 'border-border',
    tools: [
      { id: 'stats', title: 'Estadísticas del ganado', description: 'Termómetro de salud, pesajes y engorde (ADG)', icon: BarChart3, path: '/campesino/estadisticas', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'health', title: 'Salud animal', description: 'Novedades, tratamientos y botiquín veterinario', icon: IconHealthAlert, path: '/campesino/health', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'milk', title: 'Registrar ordeño', description: 'Litros de leche de la mañana o de la tarde', icon: IconMilk, path: '/campesino/registro-operativo?modal=milk', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'transfer', title: 'Trasladar ganado', description: 'Mover lote de animales entre potreros', icon: IconRouteCattle, path: '/campesino/registro-operativo?modal=transfer', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'registro', title: 'Registro diario', description: 'Anotar labores de campo, ganado y cuentas', icon: IconClipboardList, path: '/campesino/registro-operativo', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
    ],
  },
  {
    title: 'Cultivos y agua',
    color: 'text-primary',
    border: 'border-border',
    tools: [
      { id: 'plots', title: 'Parcelas y cultivos', description: 'Manejar lotes de siembra y cosechas', icon: Sprout, path: '/campesino/crop-plots', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'crop-activities', title: 'Labores de cultivo', description: 'Siembra, desyerbe, riego y abono', icon: Leaf, path: '/campesino/crop-activities', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'water', title: 'Fuentes de agua', description: 'Quebradas, reservorios y bebederos', icon: Droplet, path: '/campesino/water-sources', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
    ],
  },
  {
    title: 'Clima y apoyo',
    color: 'text-primary',
    border: 'border-border',
    tools: [
      { id: 'scanner', title: 'Escanear chapeta', description: 'Identificar animal por su orejera', icon: IconTag, path: '/scanner', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'tasks', title: 'Agenda de tareas', description: 'Labores y trabajos asignados para hoy', icon: CheckSquare, path: '/operario/tasks', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'weather', title: 'Estación de clima', description: 'Pronóstico de lluvia y temperatura local', icon: CloudSun, path: '/campesino/weather', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
      { id: 'alerts', title: 'Alertas de clima', description: 'Avisos de helada, sequía y vendaval', icon: CloudAlert, path: '/campesino/climate-alerts', bg: 'bg-card hover:border-primary/50', requiresOnline: true },
      { id: 'market', title: 'Mercado campesino', description: 'Vender o comprar productos de la región', icon: ShoppingBag, path: '/campesino/market-offers', bg: 'bg-card hover:border-primary/50', requiresOnline: true },
      { id: 'assistance', title: 'Ayuda técnica', description: 'Consultar con el veterinario o agrónomo', icon: Headset, path: '/campesino/technical-assistance', bg: 'bg-card hover:border-primary/50', requiresOnline: true },
      { id: 'learning', title: 'Aprender sin conexión', description: 'Cartillas y manuales prácticos para el campo', icon: BookOpen, path: '/campesino/aprender', bg: 'bg-card hover:border-primary/50', requiresOnline: false },
    ],
  },
];

export const TIPS_FALLBACK: DashboardTip[] = [
  { text: 'La aplicación permite registrar labores sin conexión a internet; la información se sincronizará automáticamente al recuperar la señal.' },
  { text: 'Registra tus labores diarias de campo para mantener la trazabilidad productiva y sanitaria de la finca.' },
];
