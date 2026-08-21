import { isNewerControl, type ControlRecord } from "../hooks/controlSummary.utils";
import { isWithinRange, type PeriodRange } from "./reportPeriod";

export type HealthBucketKey = "sano" | "observacion" | "grave" | "desconocido";

export interface HealthBucket {
	key: HealthBucketKey;
	label: string;
	count: number;
	percentage: number;
}

export interface HealthBreakdown {
	/** Animales distintos con al menos un control registrado. */
	total: number;
	buckets: HealthBucket[];
}

export interface StaleCheckAnimal {
	animalId: number;
	daysSinceCheck: number;
}

export interface WeighingReport {
	/** Pesajes registrados dentro del periodo. */
	count: number;
	/** Animales distintos pesados en el periodo. */
	animals: number;
	/** null cuando nadie se pesó: no se muestra un promedio inventado. */
	averageWeight: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const BUCKET_BY_STATUS: Record<string, HealthBucketKey> = {
	excelente: "sano",
	bueno: "sano",
	sano: "sano",
	regular: "observacion",
	malo: "grave",
	enfermo: "grave",
	critico: "grave",
};

const BUCKET_LABEL: Record<HealthBucketKey, string> = {
	sano: "Sanos",
	observacion: "En observación",
	grave: "Graves",
	desconocido: "Sin estado claro",
};

const BUCKET_ORDER: HealthBucketKey[] = [
	"sano",
	"observacion",
	"grave",
	"desconocido",
];

function normalize(value: unknown): string {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

function controlDay(row: ControlRecord): string {
	const raw = String(
		row.checkup_date ??
			row.checkupDate ??
			row.control_date ??
			row.controlDate ??
			row.created_at ??
			row.createdAt ??
			"",
	).slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

/** Último control de cada animal, que es el que describe su estado actual. */
function latestByAnimal(rows: ControlRecord[]): Map<number, ControlRecord> {
	const latest = new Map<number, ControlRecord>();
	for (const row of rows) {
		const animalId = Number(row.animal_id ?? row.animalId);
		if (!Number.isFinite(animalId)) continue;
		const current = latest.get(animalId);
		if (!current || isNewerControl(row, current)) {
			latest.set(animalId, row);
		}
	}
	return latest;
}

export function buildHealthBreakdown(rows: ControlRecord[]): HealthBreakdown {
	const counts: Record<HealthBucketKey, number> = {
		sano: 0,
		observacion: 0,
		grave: 0,
		desconocido: 0,
	};

	for (const row of latestByAnimal(rows).values()) {
		const key =
			BUCKET_BY_STATUS[normalize(row.health_status ?? row.healthStatus)] ??
			"desconocido";
		counts[key] += 1;
	}

	const total = BUCKET_ORDER.reduce((sum, key) => sum + counts[key], 0);
	return {
		total,
		buckets: BUCKET_ORDER.map((key) => ({
			key,
			label: BUCKET_LABEL[key],
			count: counts[key],
			percentage: total ? (counts[key] / total) * 100 : 0,
		})),
	};
}

/**
 * Animales que llevan más de `thresholdDays` sin revisión, del más olvidado al
 * más reciente: es la lista de trabajo pendiente del operario.
 */
export function findAnimalsWithoutRecentCheck(
	rows: ControlRecord[],
	today: string,
	thresholdDays: number,
): StaleCheckAnimal[] {
	const end = Date.parse(`${today.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(end)) return [];

	const stale: StaleCheckAnimal[] = [];
	for (const [animalId, row] of latestByAnimal(rows)) {
		const day = controlDay(row);
		if (!day) continue;
		const daysSinceCheck = Math.round(
			(end - Date.parse(`${day}T00:00:00Z`)) / DAY_MS,
		);
		if (daysSinceCheck > thresholdDays) stale.push({ animalId, daysSinceCheck });
	}

	return stale.sort((a, b) => b.daysSinceCheck - a.daysSinceCheck);
}

export function buildWeighingReport(
	rows: ControlRecord[],
	range: PeriodRange,
): WeighingReport {
	const weights: number[] = [];
	const animals = new Set<number>();

	for (const row of rows) {
		if (!isWithinRange(controlDay(row), range)) continue;
		const weight = Number(row.weight);
		if (!Number.isFinite(weight) || weight <= 0) continue;
		weights.push(weight);
		animals.add(Number(row.animal_id ?? row.animalId));
	}

	return {
		count: weights.length,
		animals: animals.size,
		averageWeight: weights.length
			? weights.reduce((sum, weight) => sum + weight, 0) / weights.length
			: null,
	};
}
