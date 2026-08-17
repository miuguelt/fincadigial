import { describe, it, expect } from 'vitest';
import {
  normalizeFincaRows,
  consolidate,
  formatMoneyShort,
  formatMoneyExact,
  formatLiters,
  formatArea,
  barPercent,
  fincaLocation,
  averageFieldArea,
} from './fincaMetrics';

describe('normalizeFincaRows', () => {
  it('devuelve lista vacía cuando la respuesta no es un arreglo', () => {
    expect(normalizeFincaRows(null)).toEqual([]);
    expect(normalizeFincaRows({ data: [] })).toEqual([]);
    expect(normalizeFincaRows(undefined)).toEqual([]);
  });

  it('rellena con cero los KPIs que el backend omite', () => {
    const [row] = normalizeFincaRows([{ finca_id: 7, finca_name: 'La Esperanza' }]);
    expect(row.kpis.total_animals).toBe(0);
    expect(row.kpis.total_milk_liters).toBe(0);
    expect(row.kpis.net_balance).toBe(0);
    expect(row.kpis.total_fields_area).toBe(0);
  });

  it('usa el net_balance del backend en vez de restar dos flotantes', () => {
    const [row] = normalizeFincaRows([
      { finca_id: 1, kpis: { total_income: 0.3, total_expenses: 0.1, net_balance: 0.2 } },
    ]);
    expect(row.kpis.net_balance).toBe(0.2);
  });

  it('calcula el balance sólo si el backend no lo envía', () => {
    const [row] = normalizeFincaRows([
      { finca_id: 1, kpis: { total_income: 500, total_expenses: 200 } },
    ]);
    expect(row.kpis.net_balance).toBe(300);
  });

  it('marca la finca como activa salvo que venga explícitamente en false', () => {
    const [activa, inactiva] = normalizeFincaRows([
      { finca_id: 1 },
      { finca_id: 2, finca_is_active: false },
    ]);
    expect(activa.finca_is_active).toBe(true);
    expect(inactiva.finca_is_active).toBe(false);
  });

  it('rellena tipo y rol con un texto legible en vez de dejar undefined', () => {
    const [row] = normalizeFincaRows([{ finca_id: 1 }]);
    expect(row.finca_type).toBe('Sin tipo');
    expect(row.role).toBe('Sin rol');
  });
});

describe('consolidate', () => {
  const rows = normalizeFincaRows([
    {
      finca_id: 1,
      finca_name: 'A',
      kpis: { total_animals: 809, total_milk_liters: 669632.481, net_balance: 90596777.9, total_fields_area: 375 },
    },
    {
      finca_id: 2,
      finca_name: 'B',
      finca_is_active: false,
      kpis: { total_animals: 1, total_milk_liters: 5, net_balance: 0, total_fields_area: 4 },
    },
  ]);

  it('cuenta fincas totales y activas por separado', () => {
    const totals = consolidate(rows);
    expect(totals.farms).toBe(2);
    expect(totals.activeFarms).toBe(1);
  });

  it('suma animales, leche, balance y área de todas las fincas', () => {
    const totals = consolidate(rows);
    expect(totals.animals).toBe(810);
    expect(totals.milk).toBeCloseTo(669637.481, 3);
    expect(totals.balance).toBeCloseTo(90596777.9, 2);
    expect(totals.area).toBe(379);
  });

  it('devuelve ceros con una lista vacía', () => {
    expect(consolidate([])).toEqual({ farms: 0, activeFarms: 0, animals: 0, milk: 0, balance: 0, area: 0 });
  });
});

describe('formatMoneyShort', () => {
  it('abrevia los millones para que quepan en una tarjeta de celular', () => {
    expect(formatMoneyShort(90596777.9)).toBe('$90,6 millones');
  });

  it('omite el decimal cuando es cero', () => {
    expect(formatMoneyShort(5000000)).toBe('$5 millones');
  });

  it('usa "mil millones" a partir de los mil millones', () => {
    expect(formatMoneyShort(1250000000)).toBe('$1,3 mil millones');
  });

  it('muestra cifras por debajo del millón completas y sin centavos', () => {
    expect(formatMoneyShort(450000)).toBe('$450.000');
    expect(formatMoneyShort(1500.75)).toBe('$1.501');
  });

  it('antepone el signo menos al símbolo de peso', () => {
    expect(formatMoneyShort(-2500000)).toBe('-$2,5 millones');
    expect(formatMoneyShort(-12000)).toBe('-$12.000');
  });

  it('trata el cero y los valores no numéricos como $0', () => {
    expect(formatMoneyShort(0)).toBe('$0');
    expect(formatMoneyShort(Number.NaN)).toBe('$0');
  });
});

describe('formatMoneyExact', () => {
  it('escribe el valor completo en pesos, sin centavos', () => {
    expect(formatMoneyExact(90596777.9)).toBe('$90.596.778');
    expect(formatMoneyExact(-32399381.45)).toBe('-$32.399.381');
    expect(formatMoneyExact(0)).toBe('$0');
  });
});

describe('formatLiters', () => {
  it('redondea a litros enteros: las milésimas de litro no se ordeñan', () => {
    expect(formatLiters(669632.481)).toBe('669.632 L');
    expect(formatLiters(5)).toBe('5 L');
    expect(formatLiters(0)).toBe('0 L');
  });
});

describe('formatArea', () => {
  it('muestra una decimal de hectárea', () => {
    expect(formatArea(375)).toBe('375,0 ha');
    expect(formatArea(18.755)).toBe('18,8 ha');
  });
});

describe('barPercent', () => {
  it('da 100 a la finca más grande', () => {
    expect(barPercent(809, 809)).toBe(100);
  });

  it('garantiza una barra visible cuando el valor es muy pequeño pero no cero', () => {
    expect(barPercent(1, 809)).toBeGreaterThanOrEqual(3);
  });

  it('deja la barra en cero cuando no hay dato', () => {
    expect(barPercent(0, 809)).toBe(0);
  });

  it('no divide por cero cuando todas las fincas están en cero', () => {
    expect(barPercent(0, 0)).toBe(0);
  });
});

describe('fincaLocation', () => {
  it('arma "Municipio, Departamento" cuando hay ambos', () => {
    expect(fincaLocation({ municipality: 'Tuluá', department: 'Valle del Cauca' })).toBe('Tuluá, Valle del Cauca');
  });

  it('devuelve el dato que exista si falta el otro', () => {
    expect(fincaLocation({ municipality: 'Tuluá', department: '' })).toBe('Tuluá');
    expect(fincaLocation({ municipality: '', department: 'Valle del Cauca' })).toBe('Valle del Cauca');
  });

  it('devuelve null cuando no hay ubicación registrada', () => {
    expect(fincaLocation({ municipality: '', department: '' })).toBeNull();
  });
});

describe('averageFieldArea', () => {
  it('reparte el área entre los potreros', () => {
    expect(averageFieldArea({ total_fields: 20, total_fields_area: 375 })).toBe(18.75);
  });

  it('devuelve 0 sin potreros en vez de dividir por cero', () => {
    expect(averageFieldArea({ total_fields: 0, total_fields_area: 375 })).toBe(0);
  });
});
