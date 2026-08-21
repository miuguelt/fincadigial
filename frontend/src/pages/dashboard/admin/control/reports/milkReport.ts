import { eachDateInRange, isWithinRange, type PeriodRange } from "./reportPeriod";

export interface MilkDailyPoint {
	date: string;
	liters: number;
	animals: number;
}

export interface MilkReport {
	totalLiters: number;
	/** Promedio sobre los días que sí tuvieron ordeño registrado. */
	dailyAverage: number;
	daysWithRecords: number;
	bestDay: MilkDailyPoint | null;
	/** null cuando no hay animales ordeñados: no se divide por cero. */
	litersPerAnimal: number | null;
	/** Serie continua del rango, con cero en los días sin registro. */
	points: MilkDailyPoint[];
	/** true cuando la consulta falló: la vista dice "sin datos", no cero. */
	unavailable: boolean;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}

function toNumber(value: unknown): number {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
}

function readBreakdown(raw: unknown): UnknownRecord[] {
	const envelope = asRecord(raw);
	const data = asRecord(envelope?.data) ?? envelope;
	const breakdown = data?.daily_breakdown ?? data?.dailyBreakdown;
	return Array.isArray(breakdown) ? (breakdown as UnknownRecord[]) : [];
}

function readAnimalCount(raw: unknown): number {
	const envelope = asRecord(raw);
	const data = asRecord(envelope?.data) ?? envelope;
	return toNumber(data?.animal_count ?? data?.animalCount);
}

function emptyReport(range: PeriodRange, unavailable: boolean): MilkReport {
	return {
		totalLiters: 0,
		dailyAverage: 0,
		daysWithRecords: 0,
		bestDay: null,
		litersPerAnimal: null,
		points: eachDateInRange(range).map((date) => ({
			date,
			liters: 0,
			animals: 0,
		})),
		unavailable,
	};
}

/**
 * Convierte el desglose diario del API en el reporte de ordeño del periodo.
 * Los días del API que caen fuera del rango se descartan: el resumen semanal
 * del backend arranca en lunes y no siempre coincide con la ventana pedida.
 */
export function buildMilkReport(raw: unknown, range: PeriodRange): MilkReport {
	if (raw === null || raw === undefined) return emptyReport(range, true);

	const byDate = new Map<string, MilkDailyPoint>();
	for (const entry of readBreakdown(raw)) {
		const date = String(entry.date ?? "").slice(0, 10);
		if (!isWithinRange(date, range)) continue;
		byDate.set(date, {
			date,
			liters: toNumber(entry.total_liters ?? entry.totalLiters),
			animals: toNumber(entry.animal_count ?? entry.animalCount),
		});
	}

	const points = eachDateInRange(range).map(
		(date) => byDate.get(date) ?? { date, liters: 0, animals: 0 },
	);
	const withRecords = [...byDate.values()].filter((point) => point.liters > 0);
	const totalLiters = withRecords.reduce((sum, point) => sum + point.liters, 0);
	const animals = readAnimalCount(raw);

	return {
		totalLiters,
		daysWithRecords: withRecords.length,
		dailyAverage: withRecords.length ? totalLiters / withRecords.length : 0,
		bestDay: withRecords.reduce<MilkDailyPoint | null>(
			(best, point) => (!best || point.liters > best.liters ? point : best),
			null,
		),
		litersPerAnimal: animals > 0 ? totalLiters / animals : null,
		points,
		unavailable: false,
	};
}
