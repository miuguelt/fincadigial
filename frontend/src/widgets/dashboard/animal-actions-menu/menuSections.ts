import type { ComponentType } from 'react';
import { CalendarCheck } from 'lucide-react';

import {
  IconActivity,
  IconBell,
  IconClipboardList,
  IconDna,
  IconHeart,
  IconMapPin,
  IconMilk,
  IconPill,
  IconSyringe,
} from '@/shared/ui/icons';

import type { ModalType } from '../AnimalActionsMenu.types';

export type SectionId = 'health' | 'production' | 'location' | 'genetics' | 'planning';

export interface ModuleConfig {
  type: Exclude<ModalType, null>;
  label: string;
  createLabel: string;
  viewLabel: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
}

interface SectionConfig {
  id: SectionId;
  title: string;
  modules: ModuleConfig[];
}

export const MENU_SECTIONS: SectionConfig[] = [
  {
    id: 'health',
    title: 'Salud y bienestar',
    modules: [
      { type: 'animal_disease', label: 'Enfermedades', createLabel: 'Registrar enfermedad', viewLabel: 'Ver registros de enfermedades', icon: IconActivity, iconClassName: 'text-rose-500' },
      { type: 'vaccination', label: 'Vacunación', createLabel: 'Registrar vacuna', viewLabel: 'Ver registros de vacunación', icon: IconSyringe, iconClassName: 'text-blue-500' },
      { type: 'treatment', label: 'Tratamientos', createLabel: 'Registrar tratamiento', viewLabel: 'Ver tratamientos', icon: IconPill, iconClassName: 'text-purple-500' },
      { type: 'control', label: 'Controles y pesajes', createLabel: 'Registrar control o pesaje', viewLabel: 'Ver controles y pesajes', icon: IconClipboardList, iconClassName: 'text-orange-500' },
    ],
  },
  {
    id: 'production',
    title: 'Producción',
    modules: [
      { type: 'milk_production', label: 'Producción lechera', createLabel: 'Registrar producción lechera', viewLabel: 'Ver registros de producción lechera', icon: IconMilk, iconClassName: 'text-cyan-500' },
      { type: 'reproduction_event', label: 'Reproducción', createLabel: 'Registrar evento reproductivo', viewLabel: 'Ver eventos reproductivos', icon: IconHeart, iconClassName: 'text-pink-500' },
    ],
  },
  {
    id: 'location',
    title: 'Ubicación y rotación',
    modules: [
      { type: 'animal_field', label: 'Asignación de potrero', createLabel: 'Registrar asignación de potrero', viewLabel: 'Ver asignaciones de potrero', icon: IconMapPin, iconClassName: 'text-amber-500' },
    ],
  },
  {
    id: 'genetics',
    title: 'Genética y linaje',
    modules: [
      { type: 'genetic_improvement', label: 'Mejora genética', createLabel: 'Registrar mejora genética', viewLabel: 'Ver mejoras genéticas', icon: IconDna, iconClassName: 'text-emerald-500' },
    ],
  },
  {
    id: 'planning',
    title: 'Alertas y tareas',
    modules: [
      { type: 'alert', label: 'Alertas del animal', createLabel: 'Registrar alerta', viewLabel: 'Ver alertas del animal', icon: IconBell, iconClassName: 'text-yellow-500' },
      { type: 'task', label: 'Tareas programadas', createLabel: 'Registrar tarea', viewLabel: 'Ver tareas programadas', icon: CalendarCheck, iconClassName: 'text-teal-500' },
    ],
  },
];
