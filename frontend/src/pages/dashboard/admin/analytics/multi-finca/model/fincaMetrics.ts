/**
 * Métricas y formato de la vista multi-finca.
 *
 * Todo lo que aquí se calcula o se escribe termina delante de alguien que
 * administra la finca desde el celular, muchas veces en el potrero. De ahí las
 * dos reglas del módulo:
 *
 *  - El backend puede omitir `kpis` o alguna de sus claves cuando una finca no
 *    tiene movimientos, así que se normaliza una sola vez y el render nunca
 *    accede a propiedades de `undefined` ni imprime NaN.
 *  - Las cifras se escriben como se dicen en la finca: pesos sin centavos,
 *    litros enteros y millones abreviados. Los centavos de un balance de
 *    noventa millones y las milésimas de litro son ruido, no precisión.
 */

export interface FincaKpis {
  total_animals: number;
  total_animals_females: number;
  total_animals_males: number;
  total_milk_liters: number;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  total_fields: number;
  total_fields_area: number;
}

export interface FincaRow {
  finca_id: number;
  finca_name: string;
  finca_type: string;
  finca_is_active: boolean;
  department: string;
  municipality: string;
  role: string;
  kpis: FincaKpis;
}

export interface ConsolidatedTotals {
  farms: number;
  activeFarms: number;
  animals: number;
  milk: number;
  balance: number;
  area: number;
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/** Convierte la respuesta de `/multi-finca/compare-kpis` en filas seguras de renderizar. */
export function normalizeFincaRows(raw: unknown): FincaRow[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any) => {
    const kpis = item?.kpis ?? {};
    const totalIncome = num(kpis.total_income);
    const totalExpenses = num(kpis.total_expenses);

    return {
      finca_id: Number(item?.finca_id),
      finca_name: item?.finca_name || 'Finca sin nombre',
      finca_type: item?.finca_type || 'Sin tipo',
      finca_is_active: item?.finca_is_active !== false,
      department: item?.department || '',
      municipality: item?.municipality || '',
      role: item?.role || 'Sin rol',
      kpis: {
        total_animals: num(kpis.total_animals),
        total_animals_females: num(kpis.total_animals_females),
        total_animals_males: num(kpis.total_animals_males),
        total_milk_liters: num(kpis.total_milk_liters),
        total_income: totalIncome,
        total_expenses: totalExpenses,
        // El backend calcula el balance en Decimal: se usa tal cual y sólo se
        // recalcula cuando falta, para no restar dos flotantes aquí.
        net_balance: kpis.net_balance == null ? totalIncome - totalExpenses : num(kpis.net_balance),
        total_fields: num(kpis.total_fields),
        total_fields_area: num(kpis.total_fields_area),
      },
    };
  });
}

export function consolidate(rows: FincaRow[]): ConsolidatedTotals {
  return rows.reduce<ConsolidatedTotals>(
    (acc, row) => ({
      farms: acc.farms + 1,
      activeFarms: acc.activeFarms + (row.finca_is_active ? 1 : 0),
      animals: acc.animals + row.kpis.total_animals,
      milk: acc.milk + row.kpis.total_milk_liters,
      balance: acc.balance + row.kpis.net_balance,
      area: acc.area + row.kpis.total_fields_area,
    }),
    { farms: 0, activeFarms: 0, animals: 0, milk: 0, balance: 0, area: 0 },
  );
}

const decimal = (value: number, digits: number) =>
  value.toLocaleString('es-CO', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const integer = (value: number) => Math.round(value).toLocaleString('es-CO');

/** Quita el decimal cuando es cero: "5,0 millones" se lee peor que "5 millones". */
const scaled = (value: number, unit: string) => {
  const text = decimal(value, 1).replace(/,0$/, '');
  return `${text} ${unit}`;
};

/**
 * Pesos abreviados para tarjetas estrechas: `$90,6 millones`.
 * Por debajo del millón se escribe la cifra completa, que sigue siendo corta.
 */
export function formatMoneyShort(value: number): string {
  const amount = num(value);
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (abs >= 1_000_000_000) return `${sign}$${scaled(abs / 1_000_000_000, 'mil millones')}`;
  if (abs >= 1_000_000) return `${sign}$${scaled(abs / 1_000_000, 'millones')}`;
  return `${sign}$${integer(abs)}`;
}

/** Pesos completos y sin centavos, para tablas y para el `title` de las tarjetas. */
export function formatMoneyExact(value: number): string {
  const amount = num(value);
  return `${amount < 0 ? '-' : ''}$${integer(Math.abs(amount))}`;
}

export function formatLiters(value: number): string {
  return `${Math.trunc(num(value)).toLocaleString('es-CO')} L`;
}

export function formatArea(value: number): string {
  return `${decimal(num(value), 1)} ha`;
}

export function formatCount(value: number): string {
  return integer(num(value));
}

/**
 * Ancho de la barra comparativa en porcentaje.
 * Con 809 animales frente a 1, la barra exacta del segundo mide menos de un
 * píxel y parece un cero: se le garantiza un mínimo visible.
 */
export function barPercent(value: number, max: number): number {
  const safeValue = num(value);
  const safeMax = num(max);
  if (safeValue <= 0 || safeMax <= 0) return 0;
  return Math.max(3, Math.min(100, (safeValue / safeMax) * 100));
}

export function fincaLocation(row: Pick<FincaRow, 'municipality' | 'department'>): string | null {
  const parts = [row.municipality, row.department].map((part) => (part || '').trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function averageFieldArea(kpis: Pick<FincaKpis, 'total_fields' | 'total_fields_area'>): number {
  const fields = num(kpis.total_fields);
  return fields > 0 ? num(kpis.total_fields_area) / fields : 0;
}
