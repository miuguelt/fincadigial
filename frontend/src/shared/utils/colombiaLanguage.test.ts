import { describe, expect, it } from 'vitest';
import { normalizeColombianLivestockText } from './colombiaLanguage';

describe('normalizeColombianLivestockText', () => {
  it('usa ganado en lugar de hato, conservando la capitalización', () => {
    expect(normalizeColombianLivestockText('Hato General · HATO · hato')).toBe(
      'Ganado General · GANADO · ganado',
    );
  });
});
