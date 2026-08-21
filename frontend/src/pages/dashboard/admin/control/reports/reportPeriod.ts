/** Periodos que el operario puede pedir; coinciden con lo que sirve el API. */
export type ReportPeriod = "semana" | "mes";

export interface PeriodRange {
	period: ReportPeriod;
	/** Primer día incluido, YYYY-MM-DD. */
	start: string;
	/** Último día incluido, YYYY-MM-DD (hoy). */
	end: string;
	label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Convierte YYYY-MM-DD a milisegundos UTC; NaN si no es una fecha. */
function toUtc(dateOnly: string): number {
	return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)
		? Date.parse(`${dateOnly}T00:00:00Z`)
		: Number.NaN;
}

function fromUtc(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Rango del reporte. Ambos terminan hoy: el mes muestra lo que va corrido, no
 * un mes completo que todavía no ocurrió.
 */
export function buildPeriodRange(
	period: ReportPeriod,
	today: string,
): PeriodRange {
	const end = today.slice(0, 10);
	if (period === "mes") {
		return {
			period,
			start: `${end.slice(0, 7)}-01`,
			end,
			label: "Mes en curso",
		};
	}
	return {
		period,
		start: fromUtc(toUtc(end) - 6 * DAY_MS),
		end,
		label: "Últimos 7 días",
	};
}

/** true si la fecha (con o sin hora) cae dentro del rango, extremos incluidos. */
export function isWithinRange(value: string, range: PeriodRange): boolean {
	const day = String(value ?? "").slice(0, 10);
	const ms = toUtc(day);
	if (Number.isNaN(ms)) return false;
	return ms >= toUtc(range.start) && ms <= toUtc(range.end);
}

/** Todos los días del rango, para graficar también los días sin registro. */
export function eachDateInRange(range: PeriodRange): string[] {
	const start = toUtc(range.start);
	const end = toUtc(range.end);
	if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];

	const days: string[] = [];
	for (let ms = start; ms <= end; ms += DAY_MS) days.push(fromUtc(ms));
	return days;
}
