import { describe, it, expect } from 'vitest';
import { normalizeColombianLivestockText, normalizeColombianSpanish } from './colombiaLanguage';

describe('normalizeColombianLivestockText y normalizeColombianSpanish', () => {
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

  it('sustituye vaquillona y vaquillonas por novilla y novillas con preservación de mayúsculas', () => {
    expect(normalizeColombianLivestockText('Vaquillona preñada y vaquillonas de levante')).toBe(
      'Novilla preñada y novillas de levante'
    );
    expect(normalizeColombianLivestockText('VAQUILLONA · VAQUILLONAS · vaquillona')).toBe(
      'NOVILLA · NOVILLAS · novilla'
    );
  });

  it('sustituye tambo y tambos por lechería o sala de ordeño según el contexto', () => {
    expect(normalizeColombianLivestockText('Gestión del tambo y tambos cooperativos')).toBe(
      'Gestión de la lechería y lecherías cooperativas'
    );
    expect(normalizeColombianLivestockText('Al tambo temprano en el tambo')).toBe(
      'A la lechería temprano en la lechería'
    );
    expect(normalizeColombianLivestockText('Rutina en sala de tambo y tambo de ordeño')).toBe(
      'Rutina en sala de ordeño y sala de ordeño'
    );
    expect(normalizeColombianLivestockText('TAMBO · TAMBOS')).toBe(
      'LECHERÍA · LECHERÍAS'
    );
  });

  it('sustituye rebaño y rebaños por ganado', () => {
    expect(normalizeColombianLivestockText('Rebaño bovino y rebaños registrados')).toBe(
      'Ganado bovino y ganado registrados'
    );
  });

  it('mantiene paridad total con el alias exportado normalizeColombianSpanish', () => {
    expect(normalizeColombianSpanish).toBe(normalizeColombianLivestockText);
    expect(normalizeColombianSpanish('vaquillona en tambo')).toBe('novilla en lechería');
  });

  it('respeta cadenas vacías o sin términos restringidos', () => {
    expect(normalizeColombianLivestockText('')).toBe('');
    expect(normalizeColombianLivestockText('Finca Villa Luz')).toBe('Finca Villa Luz');
  });
});
