import { describe, it, expect } from 'vitest';
import { normalizeColombianLivestockText } from './colombiaLanguage';

describe('normalizeColombianLivestockText', () => {
  it('sustituye variantes de hato por ganado', () => {
    expect(normalizeColombianLivestockText('Hato General · HATO · hato')).toBe(
      'Ganado General · GANADO · ganado'
    );
  });

  it('sustituye rancho y estancia por finca', () => {
    expect(normalizeColombianLivestockText('Rancho El Paraíso en estancia')).toBe(
      'Finca El Paraíso en finca'
    );
  });

  it('respeta cadenas vacías o sin términos restringidos', () => {
    expect(normalizeColombianLivestockText('')).toBe('');
    expect(normalizeColombianLivestockText('Finca Villa Luz')).toBe('Finca Villa Luz');
  });
});
