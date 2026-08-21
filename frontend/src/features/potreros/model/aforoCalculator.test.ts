import { describe, it, expect } from 'vitest';
import { getStandardRestDays, FORAGE_REST_STANDARDS } from '../ui/SemaforoPotrerosCard';

describe('Zootecnia y Forrajes Colombianos - Cálculos y Días de Descanso', () => {
  it('debe asignar correctamente los días de descanso estándar por variedad de pasto', () => {
    expect(getStandardRestDays('Brachiaria Decumbens')).toBe(FORAGE_REST_STANDARDS.brachiaria);
    expect(getStandardRestDays('Pasto Kikuyo')).toBe(FORAGE_REST_STANDARDS.kikuyo);
    expect(getStandardRestDays('Guinea Mombaza')).toBe(FORAGE_REST_STANDARDS.guinea);
    expect(getStandardRestDays('Pasto Estrella')).toBe(FORAGE_REST_STANDARDS.estrella);
    expect(getStandardRestDays(null)).toBe(FORAGE_REST_STANDARDS.default);
  });

  it('calcula la oferta forrajera aprovechable y días de soporte para un lote bovino', () => {
    const samples = [1.2, 1.5, 1.4]; // kg/m2
    const avgKgM2 = samples.reduce((a, b) => a + b, 0) / samples.length; // ~1.366 kg/m2
    const areaHa = 2.0; // 2 hectáreas = 20,000 m2
    const totalForageKg = avgKgM2 * (areaHa * 10000); // ~27,333 kg FV
    const wastePct = 25; // 25% desperdicio
    const usableForageKg = totalForageKg * (1 - wastePct / 100); // ~20,500 kg FV

    const animalCount = 30; // 30 novillos
    const weightKg = 450; // 1 UGM = 450 kg
    const dailyIntakeKg = (weightKg * 10) / 100; // 45 kg FV / día / animal
    const herdDailyIntakeKg = dailyIntakeKg * animalCount; // 1,350 kg FV / día

    const daysSupported = usableForageKg / herdDailyIntakeKg; // ~15.18 días

    expect(avgKgM2).toBeGreaterThan(1.3);
    expect(usableForageKg).toBeGreaterThan(20000);
    expect(daysSupported).toBeCloseTo(15.18, 1);
  });
});
