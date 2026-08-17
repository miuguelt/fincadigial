/**
 * Agregación de los movimientos para las dos gráficas del panel financiero.
 *
 * Es código puro a propósito: agrupar por mes y por categoría es donde de
 * verdad se puede equivocar la pantalla, y aquí se prueba sin montar React ni
 * pedirle nada al servidor.
 */

export interface FinancialTransaction {
  date?: string | null;
  transaction_type?: string | null;
  category?: string | null;
  amount?: unknown;
}

export interface MonthlyCashFlow {
  month: string;
  Ingresos: number;
  Egresos: number;
}

export interface CategoryTotal {
  name: string;
  value: number;
}

/** Los mismos literales que expone la API; ver `isIncomeTransaction` en el entity. */
const INCOME = 'Ingreso';
const EXPENSE = 'Gasto';

/* Nombres fijos en vez de `toLocaleDateString`: la abreviatura del mes cambia
   entre versiones de ICU, y con ella la etiqueta del eje. */
const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const toAmount = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** `"2026-03-05"` → `"mar 26"`; devuelve `null` si la fecha no sirve. */
const monthLabel = (isoDate: string): string | null => {
  const match = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MONTH_NAMES[monthIndex]} ${match[1].slice(2)}`;
};

/**
 * Ingresos y egresos mes a mes, del más viejo al más reciente.
 *
 * El orden se calcula por la clave `AAAA-MM` y no invirtiendo la lista que
 * llega: así el gráfico no depende de en qué orden devuelva el servidor.
 */
export function monthlyCashFlow(transactions: FinancialTransaction[]): MonthlyCashFlow[] {
  const byMonth = new Map<string, MonthlyCashFlow>();

  for (const transaction of transactions) {
    const key = (transaction.date || '').slice(0, 7);
    const label = monthLabel(transaction.date || '');
    if (!label) continue;

    const entry = byMonth.get(key) ?? { month: label, Ingresos: 0, Egresos: 0 };
    if (transaction.transaction_type === INCOME) {
      entry.Ingresos += toAmount(transaction.amount);
    } else {
      entry.Egresos += toAmount(transaction.amount);
    }
    byMonth.set(key, entry);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, entry]) => entry);
}

/** Gastos sumados por categoría, de mayor a menor. */
export function expensesByCategory(transactions: FinancialTransaction[]): CategoryTotal[] {
  const byCategory = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.transaction_type !== EXPENSE) continue;
    const category = transaction.category || 'Otros';
    byCategory.set(category, (byCategory.get(category) ?? 0) + toAmount(transaction.amount));
  }

  return [...byCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Pesos colombianos sin centavos: en COP los decimales son ruido. */
export function formatCOP(value: unknown): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toAmount(value));
}
