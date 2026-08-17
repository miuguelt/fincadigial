import { describe, it, expect } from 'vitest';
import { expensesByCategory, formatCOP, monthlyCashFlow } from './financialCharts';

const tx = (date: string, type: string, amount: unknown, category = 'Otros') => ({
  date,
  transaction_type: type,
  amount,
  category,
});

describe('monthlyCashFlow', () => {
  it('agrupa por mes separando ingresos de egresos', () => {
    const rows = monthlyCashFlow([
      tx('2026-03-05', 'Ingreso', 100),
      tx('2026-03-20', 'Gasto', 40),
      tx('2026-03-28', 'Ingreso', 50),
    ]);
    expect(rows).toEqual([{ month: 'mar 26', Ingresos: 150, Egresos: 40 }]);
  });

  it('ordena del mes más viejo al más reciente sin depender del orden de llegada', () => {
    // El backend devuelve lo más reciente primero; antes se invertía la lista
    // y el orden del gráfico dependía de ese detalle del servidor.
    const rows = monthlyCashFlow([
      tx('2026-05-02', 'Ingreso', 10),
      tx('2026-01-02', 'Ingreso', 20),
      tx('2026-03-02', 'Ingreso', 30),
    ]);
    expect(rows.map((row) => row.month)).toEqual(['ene 26', 'mar 26', 'may 26']);
  });

  it('nombra los meses en español', () => {
    const meses = [
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
    ].map((mes) => monthlyCashFlow([tx(`2026-${mes}-01`, 'Ingreso', 1)])[0].month);

    expect(meses).toEqual([
      'ene 26', 'feb 26', 'mar 26', 'abr 26', 'may 26', 'jun 26',
      'jul 26', 'ago 26', 'sep 26', 'oct 26', 'nov 26', 'dic 26',
    ]);
  });

  it('ignora los movimientos sin fecha en vez de agruparlos aparte', () => {
    expect(monthlyCashFlow([tx('', 'Ingreso', 10), tx('2026-03-01', 'Ingreso', 5)])).toEqual([
      { month: 'mar 26', Ingresos: 5, Egresos: 0 },
    ]);
  });

  it('acepta montos que llegan como texto', () => {
    expect(monthlyCashFlow([tx('2026-03-01', 'Ingreso', '250.50')])[0].Ingresos).toBeCloseTo(250.5);
  });

  it('trata un monto ilegible como cero', () => {
    expect(monthlyCashFlow([tx('2026-03-01', 'Ingreso', 'abc')])[0].Ingresos).toBe(0);
  });

  it('devuelve lista vacía sin movimientos', () => {
    expect(monthlyCashFlow([])).toEqual([]);
  });
});

describe('expensesByCategory', () => {
  it('suma sólo los gastos, por categoría', () => {
    const rows = expensesByCategory([
      tx('2026-03-01', 'Gasto', 100, 'Alimento'),
      tx('2026-03-02', 'Gasto', 50, 'Alimento'),
      tx('2026-03-03', 'Gasto', 30, 'Medicamentos'),
      tx('2026-03-04', 'Ingreso', 900, 'Venta de Leche'),
    ]);
    expect(rows).toEqual([
      { name: 'Alimento', value: 150 },
      { name: 'Medicamentos', value: 30 },
    ]);
  });

  it('ordena de mayor a menor: el gasto grande va primero', () => {
    const rows = expensesByCategory([
      tx('2026-03-01', 'Gasto', 10, 'Otros'),
      tx('2026-03-02', 'Gasto', 90, 'Alimento'),
    ]);
    expect(rows.map((row) => row.name)).toEqual(['Alimento', 'Otros']);
  });

  it('agrupa bajo "Otros" lo que no trae categoría', () => {
    expect(expensesByCategory([{ date: '2026-03-01', transaction_type: 'Gasto', amount: 10 }])).toEqual([
      { name: 'Otros', value: 10 },
    ]);
  });

  it('devuelve lista vacía si no hay gastos', () => {
    expect(expensesByCategory([tx('2026-03-01', 'Ingreso', 100)])).toEqual([]);
  });
});

describe('formatCOP', () => {
  it('escribe pesos colombianos sin centavos', () => {
    expect(formatCOP(1234567)).toContain('1.234.567');
    expect(formatCOP(1234567)).not.toContain(',00');
  });

  it('trata los valores ilegibles como cero', () => {
    expect(formatCOP('abc')).toContain('0');
  });
});
