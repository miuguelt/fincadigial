import { describe, it, expect } from 'vitest';
import { describeCondition, getWmoDescription, getWeatherKind } from './wmo';

describe('getWmoDescription', () => {
  it('traduce los códigos conocidos', () => {
    expect(getWmoDescription(0)).toBe('Despejado');
    expect(getWmoDescription(95)).toBe('Tormenta');
  });

  it('dice "Sin dato" en vez de "--" o "N/A": el campesino no lee siglas', () => {
    expect(getWmoDescription(null)).toBe('Sin dato');
    expect(getWmoDescription(undefined)).toBe('Sin dato');
    expect(getWmoDescription(9999)).toBe('Sin dato');
  });
});

describe('describeCondition', () => {
  it('traduce la condición en inglés que envía el backend', () => {
    // Antes se pintaba "cloudy" tal cual bajo la temperatura del banner.
    expect(describeCondition('cloudy', 3)).toBe('Nublado');
    expect(describeCondition('clear', 0)).toBe('Despejado');
    expect(describeCondition('rain', 61)).toBe('Lluvia');
    expect(describeCondition('storm', 95)).toBe('Tormenta');
  });

  it('cae al código WMO cuando no hay condición', () => {
    expect(describeCondition(null, 2)).toBe('Parcialmente nublado');
    expect(describeCondition('', 45)).toBe('Niebla');
  });

  it('prefiere el código WMO frente a una condición desconocida en inglés', () => {
    expect(describeCondition('freezing_drizzle', 51)).toBe('Llovizna ligera');
  });

  it('deja pasar una condición que ya viene en español', () => {
    expect(describeCondition('Granizo', null)).toBe('Granizo');
  });

  it('devuelve "Sin dato" cuando no hay ni condición ni código', () => {
    expect(describeCondition(null, null)).toBe('Sin dato');
  });
});

describe('getWeatherKind', () => {
  it('agrupa el código en su familia', () => {
    expect(getWeatherKind(0)).toBe('clear');
    expect(getWeatherKind(2)).toBe('partly');
    expect(getWeatherKind(81)).toBe('rain');
    expect(getWeatherKind(null)).toBe('unknown');
  });
});
