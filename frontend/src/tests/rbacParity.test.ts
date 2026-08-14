import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROLE_PERMISSIONS, roleCan } from '@/shared/lib/rbac';

/**
 * La matriz del cliente decide qué rutas se montan y qué menús se ven.
 * Si se separa de `backend/app/utils/rbac.py` reaparecen los 403 en pantalla,
 * así que este test compara ambas fuentes entrada por entrada.
 */

const RBAC_PY = resolve(__dirname, '../../../backend/app/utils/rbac.py');

const ACTION_ALIASES: Record<string, string[]> = {
  _ACTIONS_READ: ['read'],
  _ACTIONS_READ_CREATE: ['read', 'create'],
  _ACTIONS_READ_CREATE_UPDATE: ['read', 'create', 'update'],
  _ACTIONS_READ_CREATE_UPDATE_DELETE: ['read', 'create', 'update', 'delete'],
  _ACTIONS_NONE: [],
};

type ParsedMatrix = Record<string, '*' | Record<string, string[]>>;

/** Lee `ROLE_PERMISSIONS` de rbac.py sin ejecutar Python. */
function parseBackendMatrix(source: string): ParsedMatrix {
  const start = source.indexOf('ROLE_PERMISSIONS = {');
  const end = source.indexOf('\n}\n', start);
  const block = source.slice(start, end);

  const matrix: ParsedMatrix = {};
  let currentRole: string | null = null;

  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const wildcard = line.match(/^'([\w]+)':\s*'\*'/);
    if (wildcard) {
      matrix[wildcard[1]] = '*';
      continue;
    }

    const roleOpen = line.match(/^'([\w]+)':\s*\{$/);
    if (roleOpen) {
      currentRole = roleOpen[1];
      matrix[currentRole] = {};
      continue;
    }

    if (line === '},') {
      currentRole = null;
      continue;
    }

    if (!currentRole) continue;

    const namedEntry = line.match(/^'([\w-]+)':\s*(_ACTIONS_[A-Z_]+)/);
    if (namedEntry) {
      (matrix[currentRole] as Record<string, string[]>)[namedEntry[1]] =
        ACTION_ALIASES[namedEntry[2]];
      continue;
    }

    const inlineEntry = line.match(/^'([\w-]+)':\s*\[([^\]]*)\]/);
    if (inlineEntry) {
      const actions = inlineEntry[2]
        .split(',')
        .map((a) => a.trim().replace(/'/g, ''))
        .filter(Boolean);
      (matrix[currentRole] as Record<string, string[]>)[inlineEntry[1]] = actions;
    }
  }

  return matrix;
}

describe('paridad RBAC frontend/backend', () => {
  const backendMatrix = parseBackendMatrix(readFileSync(RBAC_PY, 'utf-8'));

  it('el parser encuentra todos los roles', () => {
    expect(Object.keys(backendMatrix).sort()).toEqual(
      ['Administrador', 'Aprendiz', 'Capataz', 'Instructor', 'Operario', 'Propietario', 'Veterinario'],
    );
  });

  it('los roles del cliente son exactamente los del backend', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(Object.keys(backendMatrix).sort());
  });

  it.each(Object.keys(backendMatrix))('el rol %s tiene los mismos permisos', (role) => {
    expect(ROLE_PERMISSIONS[role]).toEqual(backendMatrix[role]);
  });

  it('roleCan permite lecturas operativas y protege datos sensibles', () => {
    expect(roleCan('Instructor', 'users', 'read')).toBe(false);
    expect(roleCan('Instructor', 'entidad-operativa-nueva', 'read')).toBe(true);
    expect(roleCan(null, 'animals', 'read')).toBe(false);
    // Las entidades del Módulo Campesino son públicas para cualquier autenticado
    expect(roleCan('Aprendiz', 'crop-plots', 'create')).toBe(true);
    // Administrador y Propietario son comodín
    expect(roleCan('Administrador', 'lo-que-sea', 'delete')).toBe(true);
  });

  it('normaliza roles y alias heredados igual que el backend', () => {
    expect(roleCan(' veterinario ', 'disease', 'read')).toBe(true);
    expect(roleCan('VETERINARIO', 'disease-animals', 'create')).toBe(true);
    expect(roleCan('capataz', 'food-types', 'read')).toBe(true);
    expect(roleCan('Aprendiz', 'treatment_medications', 'create')).toBe(false);
  });

  it('todos los roles pueden consultar el catálogo de enfermedades', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(roleCan(role, 'diseases', 'read'), role).toBe(true);
    }
  });

  it('Instructor y Veterinario manejan el CRUD de tareas', () => {
    for (const role of ['Instructor', 'Veterinario']) {
      for (const action of ['read', 'create', 'update', 'delete'] as const) {
        expect(roleCan(role, 'tasks', action)).toBe(true);
      }
    }
  });
});
