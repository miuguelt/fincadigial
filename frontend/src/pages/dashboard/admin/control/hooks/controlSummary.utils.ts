type UnknownRecord = Record<string, unknown>;

/** Fila de control tal como llega del API, sin normalizar. */
export type ControlRecord = UnknownRecord;

export interface MilkDailySummary {
	dailyLiters: number;
	milkRecords: number;
}

/** "alta" = el animal está malo/enfermo; "media" = quedó en observación. */
export type AttentionSeverity = "alta" | "media";

export interface AttentionAnimal {
	animalId: number;
	/** Estado tal como lo devolvió el API, para mostrarlo sin reinterpretarlo. */
	status: string;
	severity: AttentionSeverity;
	/** Fecha del último control (YYYY-MM-DD); cadena vacía si no es legible. */
	lastCheckDate: string;
	/** null cuando la fecha no se puede interpretar: no se inventa un número. */
	daysSinceCheck: number | null;
	description: string;
}

export interface ControlsPeriodSummary {
	monthlyControls: number;
	animalsNeedingAttention: number;
	healthyPercentage: number | null;
	/** Qué animales necesitan atención, no solo cuántos. */
	attentionAnimals: AttentionAnimal[];
}

function asRecord(value: unknown): UnknownRecord | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}

function readNumber(...values: unknown[]): number {
	for (const value of values) {
		const numeric = Number(value);
		if (value !== null && value !== "" && Number.isFinite(numeric)) {
			return numeric;
		}
	}
	return 0;
}

function unwrapObject(raw: unknown): UnknownRecord {
	const envelope = asRecord(raw);
	const data = asRecord(envelope?.data);
	return data ?? envelope ?? {};
}

export function summarizeDailyMilk(raw: unknown): MilkDailySummary {
	const data = unwrapObject(raw);
	return {
		dailyLiters: readNumber(data.total_liters, data.totalLiters),
		milkRecords: readNumber(data.count, data.record_count, data.recordCount),
	};
}

export function summarizeWeeklyMilk(raw: unknown): number {
	const data = unwrapObject(raw);
	return readNumber(data.avg_daily_liters, data.avgDailyLiters);
}

export function extractControlRows(raw: unknown): UnknownRecord[] {
	if (Array.isArray(raw)) return raw.filter(Boolean) as UnknownRecord[];

	const envelope = asRecord(raw);
	const data = envelope?.data;
	if (Array.isArray(data)) return data.filter(Boolean) as UnknownRecord[];

	const nested = asRecord(data);
	for (const candidate of [
		envelope?.items,
		envelope?.results,
		nested?.items,
		nested?.results,
	]) {
		if (Array.isArray(candidate)) {
			return candidate.filter(Boolean) as UnknownRecord[];
		}
	}
	return [];
}

function controlDate(row: UnknownRecord): string {
	return String(
		row.checkup_date ??
			row.checkupDate ??
			row.control_date ??
			row.controlDate ??
			row.created_at ??
			row.createdAt ??
			"",
	);
}

function normalizeStatus(value: unknown): string {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha en formato YYYY-MM-DD, o "" si el valor no lo es. */
function dateOnly(value: string): string {
	const candidate = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
}

/**
 * Días completos entre dos fechas YYYY-MM-DD. Se comparan como UTC para que el
 * horario de verano de otras zonas no desplace el conteo en un día.
 */
function daysBetween(from: string, to: string): number | null {
	if (!from || !to) return null;
	const start = Date.parse(`${from}T00:00:00Z`);
	const end = Date.parse(`${to}T00:00:00Z`);
	if (Number.isNaN(start) || Number.isNaN(end)) return null;
	return Math.round((end - start) / DAY_MS);
}

export function isNewerControl(
	candidate: UnknownRecord,
	current: UnknownRecord,
): boolean {
	const candidateDate = dateOnly(controlDate(candidate)) || controlDate(candidate);
	const currentDate = dateOnly(controlDate(current)) || controlDate(current);

	if (candidateDate !== currentDate) {
		return candidateDate > currentDate;
	}

	const candidateCreated = String(candidate.created_at ?? candidate.createdAt ?? "");
	const currentCreated = String(current.created_at ?? current.createdAt ?? "");
	if (candidateCreated && currentCreated && candidateCreated !== currentCreated) {
		return candidateCreated > currentCreated;
	}

	const candidateId = Number(candidate.id ?? 0);
	const currentId = Number(current.id ?? 0);
	return candidateId >= currentId;
}

const ALERT_SEVERITY: Record<string, AttentionSeverity> = {
	regular: "media",
	malo: "alta",
	enfermo: "alta",
	critico: "alta",
};

const HEALTHY_STATUSES = new Set(["excelente", "bueno", "sano"]);

export function summarizeControls(
	rows: UnknownRecord[],
	today: string,
): ControlsPeriodSummary {
	const monthPrefix = today.slice(0, 7);
	const monthlyControls = rows.filter((row) =>
		controlDate(row).startsWith(monthPrefix),
	).length;
	const latestByAnimal = new Map<number, UnknownRecord>();

	for (const row of rows) {
		const animalId = Number(row.animal_id ?? row.animalId);
		if (!Number.isFinite(animalId)) continue;
		const current = latestByAnimal.get(animalId);
		if (!current || isNewerControl(row, current)) {
			latestByAnimal.set(animalId, row);
		}
	}

	const attentionAnimals: AttentionAnimal[] = [];
	let animalsWithKnownStatus = 0;
	let healthyAnimals = 0;

	for (const [animalId, row] of latestByAnimal) {
		const rawStatus = row.health_status ?? row.healthStatus;
		const status = normalizeStatus(rawStatus);
		const severity = ALERT_SEVERITY[status];

		if (severity) {
			const lastCheckDate = dateOnly(controlDate(row));
			attentionAnimals.push({
				animalId,
				status: String(rawStatus ?? ""),
				severity,
				lastCheckDate,
				daysSinceCheck: daysBetween(lastCheckDate, dateOnly(today)),
				description: String(row.description ?? row.observations ?? ""),
			});
		}
		if (severity || HEALTHY_STATUSES.has(status)) animalsWithKnownStatus += 1;
		if (HEALTHY_STATUSES.has(status)) healthyAnimals += 1;
	}

	// Primero los graves y, dentro de cada gravedad, el control más viejo: un
	// "Malo" de hace dos semanas sin seguimiento es más urgente que uno de hoy.
	attentionAnimals.sort((a, b) => {
		if (a.severity !== b.severity) return a.severity === "alta" ? -1 : 1;
		return (b.daysSinceCheck ?? -1) - (a.daysSinceCheck ?? -1);
	});

	return {
		monthlyControls,
		animalsNeedingAttention: attentionAnimals.length,
		healthyPercentage: animalsWithKnownStatus
			? (healthyAnimals / animalsWithKnownStatus) * 100
			: null,
		attentionAnimals,
	};
}
