import { describe, it, expect } from 'vitest';
import { formatClockTime } from './formatClockTime';

describe('formatClockTime', () => {
  it('acepta la hora suelta con segundos que envía el backend', () => {
    // El caso que rompía el banner: `new Date("06:12:00")` es Invalid Date y
    // la casilla "Jornada" quedaba en "— · —".
    expect(formatClockTime('06:12:00')).toBe('6:12 a. m.');
  });

  it('acepta la hora suelta sin segundos', () => {
    expect(formatClockTime('06:12')).toBe('6:12 a. m.');
    expect(formatClockTime('18:05')).toBe('6:05 p. m.');
  });

  it('acepta una marca de tiempo ISO completa', () => {
    expect(formatClockTime('2026-08-15T06:12:00')).toBe('6:12 a. m.');
    expect(formatClockTime('2026-08-15T17:45:30')).toBe('5:45 p. m.');
  });

  it('escribe el mediodía y la medianoche como se dicen', () => {
    expect(formatClockTime('00:30')).toBe('12:30 a. m.');
    expect(formatClockTime('12:00')).toBe('12:00 p. m.');
  });

  it('devuelve null cuando no hay hora que mostrar', () => {
    expect(formatClockTime(null)).toBeNull();
    expect(formatClockTime(undefined)).toBeNull();
    expect(formatClockTime('')).toBeNull();
    expect(formatClockTime('no es una hora')).toBeNull();
  });

  it('rechaza horas fuera de rango en vez de imprimirlas', () => {
    expect(formatClockTime('25:00')).toBeNull();
    expect(formatClockTime('10:75')).toBeNull();
  });
});
