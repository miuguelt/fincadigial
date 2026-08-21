import type { HealthBreakdown, WeighingReport } from "./controlReport";
import type { MilkReport } from "./milkReport";
import type { PeriodRange } from "./reportPeriod";

export interface ReportSnapshot {
	range: PeriodRange;
	milk: MilkReport;
	health: HealthBreakdown;
	weighing: WeighingReport;
	/** Animales sin revisión en más de STALE_CHECK_DAYS días. */
	staleCount: number;
}

/** Umbral de "lleva mucho sin revisión", en días. */
export const STALE_CHECK_DAYS = 30;

/** Formato colombiano: separador de miles con punto y decimal con coma. */
export function formatNumber(value: number, maximumFractionDigits = 1): string {
	return value.toLocaleString("es-CO", { maximumFractionDigits });
}

/** Fecha corta dd/mm/aaaa a partir de un YYYY-MM-DD, sin desfase de zona. */
export function formatDayShort(dateOnly: string): string {
	const [year, month, day] = dateOnly.split("-");
	if (!year || !month || !day) return dateOnly;
	return `${day}/${month}/${year}`;
}

function bucketCount(health: HealthBreakdown, key: string): number {
	return health.buckets.find((bucket) => bucket.key === key)?.count ?? 0;
}

/** Resumen en texto plano, pensado para copiar y enviar por mensaje. */
export function buildReportText({
	range,
	milk,
	health,
	weighing,
	staleCount,
}: ReportSnapshot): string {
	const lines = [
		`Villa Luz · ${range.label} (${formatDayShort(range.start)} a ${formatDayShort(range.end)})`,
	];

	if (milk.unavailable) {
		lines.push("Leche: sin datos disponibles");
	} else {
		lines.push(
			`Leche: ${formatNumber(milk.totalLiters)} L en total, ${formatNumber(milk.dailyAverage)} L por día (${milk.daysWithRecords} días con ordeño)`,
		);
		if (milk.bestDay) {
			lines.push(
				`Mejor día: ${formatDayShort(milk.bestDay.date)} con ${formatNumber(milk.bestDay.liters)} L`,
			);
		}
	}

	lines.push(
		`Salud: ${bucketCount(health, "sano")} sanos, ${bucketCount(health, "observacion")} en observación, ${bucketCount(health, "grave")} graves (de ${health.total} animales revisados)`,
	);

	if (staleCount > 0) {
		lines.push(
			`${staleCount} animales llevan más de ${STALE_CHECK_DAYS} días sin revisión`,
		);
	}

	lines.push(
		weighing.averageWeight === null
			? "Pesajes: ninguno en el periodo"
			: `Pesajes: ${weighing.count} en ${weighing.animals} animales, promedio ${formatNumber(weighing.averageWeight)} kg`,
	);

	return lines.join("\n");
}

/**
 * CSV del ordeño diario. Se separa con punto y coma porque el decimal en
 * Colombia es la coma: con separador coma, Excel parte cada número en dos.
 */
export function buildReportCsv({ milk }: ReportSnapshot): string {
	const rows = milk.points.map(
		(point) =>
			`${point.date};${formatNumber(point.liters)};${formatNumber(point.animals, 0)}`,
	);
	return ["fecha;litros;animales_ordeñados", ...rows].join("\n");
}
