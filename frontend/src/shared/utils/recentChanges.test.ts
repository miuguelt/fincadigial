import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  buildRecentFlags,
  extractIdsFromResponse,
  forgetRecentChange,
  isNonEntityPath,
  isRecentlyChanged,
  markRecentChange,
  rootResourceOfPath,
  __recentChangesStore,
} from './recentChanges';

describe('recentChanges (registro de cambios recientes)', () => {
  beforeEach(() => {
    __recentChangesStore().clear();
  });

  it('marca un registro creado y lo detecta por recurso + id', () => {
    markRecentChange('milk-production', 42, 'created');
    expect(isRecentlyChanged('milk-production', 42)).toBe('created');
    expect(isRecentlyChanged('milk-production', 99)).toBeNull();
    expect(isRecentlyChanged('animals', 42)).toBeNull();
  });

  it('diferencia editado de creado', () => {
    markRecentChange('control', 7, 'updated');
    expect(isRecentlyChanged('control', 7)).toBe('updated');
  });

  it('buildRecentFlags construye el mapa id → acción para la lista', () => {
    markRecentChange('animals', 1, 'created');
    markRecentChange('animals', 2, 'updated');
    markRecentChange('animals', 3, 'created');
    const flags = buildRecentFlags('animals', [1, 2, 3, 4]);
    expect(flags).toEqual({ '1': 'created', '2': 'updated', '3': 'created' });
  });

  it('forgetRecentChange limpia una marca', () => {
    markRecentChange('animals', 1, 'created');
    forgetRecentChange('animals', 1);
    expect(isRecentlyChanged('animals', 1)).toBeNull();
  });

  it('expira las entradas pasada la ventana de resaltado', () => {
    vi.spyOn(Date, 'now').mockReturnValue(0);
    markRecentChange('animals', 1, 'created');
    markRecentChange('animals', 2, 'created');

    vi.spyOn(Date, 'now').mockReturnValue(121_000);
    expect(isRecentlyChanged('animals', 1)).toBeNull();
    expect(isRecentlyChanged('animals', 2)).toBeNull();
    vi.restoreAllMocks();
  });

  it('deriva la raíz del recurso igual que emitDataRefresh', () => {
    expect(rootResourceOfPath('/milk-production/123')).toBe('milk-production');
    expect(rootResourceOfPath('control?page=2')).toBe('control');
    expect(rootResourceOfPath('api/v1/animals')).toBe('api');
    expect(rootResourceOfPath('')).toBe('');
  });

  it('anula rutas que no son entidades (auth, exports, chat…)', () => {
    expect(isNonEntityPath('auth/login')).toBe(true);
    expect(isNonEntityPath('multi-finca/switch')).toBe(true);
    expect(isNonEntityPath('exports/milk.xlsx')).toBe(true);
    expect(isNonEntityPath('uploads/images')).toBe(true);
    expect(isNonEntityPath('milk-production')).toBe(false);
    expect(isNonEntityPath('animals')).toBe(false);
  });

  it('extrae ids de respuestas con sobre-envolturas y listas', () => {
    expect(extractIdsFromResponse({ success: true, data: { id: 11 } })).toEqual([11]);
    expect(extractIdsFromResponse({ success: true, data: { data: { id: 'abc' } } })).toEqual(['abc']);
    expect(extractIdsFromResponse({ success: true, data: [{ id: 1 }, { id: 2 }] })).toEqual([1, 2]);
    expect(extractIdsFromResponse({ result: { id: 3 } })).toEqual([3]);
    expect(extractIdsFromResponse(null)).toEqual([]);
    expect(extractIdsFromResponse({ success: true, message: 'ok' })).toEqual([]);
  });
});
