import { describe, expect, it } from 'vitest';
import { fitImageDimensions } from './imageOptimizer';

describe('fitImageDimensions', () => {
  it('mantiene la proporción al limitar el ancho', () => {
    expect(fitImageDimensions(4000, 2000, 1920, 1920)).toEqual({ width: 1920, height: 960 });
  });

  it('mantiene imágenes pequeñas sin ampliarlas', () => {
    expect(fitImageDimensions(800, 600, 1920, 1920)).toEqual({ width: 800, height: 600 });
  });

  it('rechaza dimensiones inválidas', () => {
    expect(() => fitImageDimensions(0, 600, 1920, 1920)).toThrow();
    expect(() => fitImageDimensions(800, 600, 0, 1920)).toThrow();
  });
});
