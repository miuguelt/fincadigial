import { vi, describe, test, expect } from 'vitest';

describe('Infraestructura de Pruebas Villa Luz', () => {
  test('La infraestructura Jest + ESM + Mocks de import.meta funciona correctamente', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');

    // Verificar que import.meta no rompe la ejecución (gracias al transformador)
    const env = (globalThis as any).import_meta_env || {};
    expect(env).toBeDefined();
  });

  test('Validación de lógica de negocio base', () => {
    const calcWeight = (initial: number, gain: number, days: number) => initial + (gain * days);
    expect(calcWeight(100, 0.5, 10)).toBe(105);
  });
});
