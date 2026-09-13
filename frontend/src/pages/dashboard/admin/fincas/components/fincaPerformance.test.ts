import { describe, expect, it } from 'vitest';
import {
  calculateAnimalsPerField,
  formatFincaMoney,
  formatFincaMoneyShort,
  formatFincaNumber,
  normalizeFincaPerformanceRows,
} from './fincaPerformance';

describe('finca performance helpers', () => {
  it('Given KPI rows from the API, When they are normalized, Then only valid finca metrics are indexed', () => {
    const result = normalizeFincaPerformanceRows([
      {
        finca_id: 7,
        kpis: {
          total_animals: 12,
          total_milk_liters: 480,
          net_balance: 1250000,
        },
      },
      { finca_id: 'invalid', kpis: { total_animals: 99 } },
      { finca_id: 8 },
    ]);

    expect(result.get(7)).toMatchObject({ total_animals: 12, total_milk_liters: 480, net_balance: 1250000 });
    expect(result.has(8)).toBe(false);
    expect(result.size).toBe(1);
  });

  it('Given Colombian display values, When they are formatted, Then thousands and currency remain readable', () => {
    expect(formatFincaNumber(12500)).toBe('12.500');
    expect(formatFincaMoney(1250000)).toBe('$1.250.000');
    expect(formatFincaMoneyShort(1250000)).toBe('$1,3 M');
    expect(formatFincaNumber(undefined)).toBe('—');
  });

  it('Given animals and fields, When density is calculated, Then it avoids division by zero', () => {
    expect(calculateAnimalsPerField(12, 3)).toBe('4,0');
    expect(calculateAnimalsPerField(12, 0)).toBe('—');
  });
});
