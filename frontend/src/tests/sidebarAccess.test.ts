import { describe, expect, it } from 'vitest';
import {
  filterSidebarItemsByRole,
  sidebarItems,
  type Role,
  type SidebarItemConfig,
} from '@/widgets/dashboard/sidebarConfig';
import { roleCan } from '@/shared/lib/rbac';

const ROLES: Role[] = [
  'Administrador',
  'Propietario',
  'Capataz',
  'Instructor',
  'Veterinario',
  'Aprendiz',
  'Operario',
];

function flatten(items: SidebarItemConfig[]): SidebarItemConfig[] {
  return items.flatMap((item) => [item, ...(item.children ? flatten(item.children) : [])]);
}

describe('acceso del sidebar por RBAC', () => {
  it.each(ROLES)('no muestra entradas incompatibles al rol %s', (role) => {
    const visibleItems = flatten(filterSidebarItemsByRole(sidebarItems, role));

    for (const item of visibleItems) {
      if (item.permission) {
        expect(
          roleCan(role, item.permission.entity, item.permission.action ?? 'read'),
          `${role} -> ${item.title}`,
        ).toBe(true);
      }
    }
  });

  it('oculta a Instructor la gestión de usuarios y configuración de finca', () => {
    const titles = flatten(filterSidebarItemsByRole(sidebarItems, 'Instructor')).map((item) => item.title);

    expect(titles).not.toContain('Solicitudes de ingreso');
    expect(titles).not.toContain('Personal de la finca');
    expect(titles).not.toContain('Finca y permisos');
    expect(titles).not.toContain('Ajustes del sistema');
  });

  it('separa la administración global del personal de la finca', () => {
    const farmAdminTitles = flatten(
      filterSidebarItemsByRole(sidebarItems, 'Administrador', false),
    ).map((item) => item.title);
    const masterAdminTitles = flatten(
      filterSidebarItemsByRole(sidebarItems, 'Administrador', true),
    ).map((item) => item.title);

    expect(farmAdminTitles).toContain('Personal de la finca');
    expect(farmAdminTitles).not.toContain('Usuarios del sistema');
    expect(farmAdminTitles).not.toContain('Todas las fincas');
    expect(masterAdminTitles).toContain('Personal de la finca');
    expect(masterAdminTitles).toContain('Usuarios del sistema');
    expect(masterAdminTitles).toContain('Todas las fincas');
  });
});
