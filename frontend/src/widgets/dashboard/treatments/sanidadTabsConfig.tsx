import type { ReactNode } from 'react';
import {
  Activity,
  Calendar,
  HeartPulse,
  Layers,
  Pill,
  ShieldAlert,
  Syringe,
  TrendingUp,
} from 'lucide-react';

import { canAccessRoutePath, getRouteSection, toRolePath } from '@/shared/lib/routeAccess';

export interface TabItem {
  id: string;
  label: string;
  shortLabel?: string;
  path: string;
  icon: ReactNode;
  emoji?: string;
}

export interface TabGroup {
  title: string;
  shortTitle?: string;
  emoji?: string;
  items: TabItem[];
}

export const SANIDAD_TAB_GROUPS: Record<string, TabGroup> = {
  cases: {
    title: 'Casos clínicos',
    shortTitle: 'Sanidad',
    emoji: '🚨',
    items: [
      {
        id: 'disease-animals',
        label: 'Animales enfermos',
        shortLabel: 'Enfermos',
        emoji: '🐮',
        path: '/admin/disease-animals',
        icon: <ShieldAlert className="h-4 w-4" />,
      },
      {
        id: 'diseases',
        label: 'Enfermedades',
        shortLabel: 'Enfermedades',
        emoji: '📋',
        path: '/admin/diseases',
        icon: <HeartPulse className="h-4 w-4" />,
      },
    ],
  },
  treatments: {
    title: 'Aplicaciones sanitarias',
    shortTitle: 'Tratamientos',
    emoji: '💉',
    items: [
      {
        id: 'treatments',
        label: 'Tratamientos',
        shortLabel: 'Tratamientos',
        emoji: '🩺',
        path: '/admin/treatments',
        icon: <Activity className="h-4 w-4" />,
      },
      {
        id: 'vaccinations',
        label: 'Vacunaciones',
        shortLabel: 'Vacunaciones',
        emoji: '📅',
        path: '/admin/vaccinations',
        icon: <Calendar className="h-4 w-4" />,
      },
      {
        id: 'treatment-medications',
        label: 'Medicamentos aplicados',
        shortLabel: 'Medicados',
        emoji: '💊',
        path: '/admin/treatment_medications',
        icon: <Pill className="h-4 w-4" />,
      },
      {
        id: 'treatment-vaccines',
        label: 'Vacunas aplicadas',
        shortLabel: 'Vacunas aplicadas',
        emoji: '💉',
        path: '/admin/treatment_vaccines',
        icon: <Syringe className="h-4 w-4" />,
      },
      {
        id: 'analytics',
        label: 'Análisis y reportes',
        shortLabel: 'Análisis',
        emoji: '📊',
        path: '/admin/treatments/analytics',
        icon: <TrendingUp className="h-4 w-4" />,
      },
    ],
  },
  supplies: {
    title: 'Insumos sanitarios',
    shortTitle: 'Botiquín',
    emoji: '📦',
    items: [
      {
        id: 'medications',
        label: 'Medicamentos',
        shortLabel: 'Medicamentos',
        emoji: '💊',
        path: '/admin/medications',
        icon: <Pill className="h-4 w-4" />,
      },
      {
        id: 'vaccines',
        label: 'Vacunas y biológicos',
        shortLabel: 'Vacunas',
        emoji: '💉',
        path: '/admin/vaccines',
        icon: <Syringe className="h-4 w-4" />,
      },
      {
        id: 'inventory',
        label: 'Inventario de insumos',
        shortLabel: 'Inventario',
        emoji: '📦',
        path: '/admin/inventory',
        icon: <Layers className="h-4 w-4" />,
      },
    ],
  },
};

export function getVisibleSanidadGroups(role: string): Array<readonly [string, TabGroup]> {
  return Object.entries(SANIDAD_TAB_GROUPS)
    .map(([groupId, group]) => {
      const items = group.items
        .map((item) => ({ ...item, path: toRolePath(role, item.path) }))
        .filter((item) => canAccessRoutePath(role, item.path));

      return [groupId, { ...group, items }] as const;
    })
    .filter(([, group]) => group.items.length > 0);
}

/**
 * Finds the most specific matching route so a child view wins over its parent.
 * For example, `/admin/treatments/analytics` must activate `analytics`, not
 * the broader `treatments` tab.
 */
export function findActiveSanidadTab(
  groups: Array<readonly [string, TabGroup]>,
  pathname: string,
): { groupId: string; tabId: string } {
  const currentSection = getRouteSection(pathname);
  const matches = groups.flatMap(([groupId, group]) =>
    group.items
      .filter((item) => {
        const section = getRouteSection(item.path);
        return currentSection === section || currentSection.startsWith(`${section}/`);
      })
      .map((item) => ({ groupId, tabId: item.id, section: getRouteSection(item.path) })),
  );

  const match = matches.sort((a, b) => b.section.length - a.section.length)[0];
  return match
    ? { groupId: match.groupId, tabId: match.tabId }
    : { groupId: groups[0]?.[0] ?? '', tabId: '' };
}
