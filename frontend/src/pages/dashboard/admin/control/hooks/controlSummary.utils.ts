type UnknownRecord = Record<string, unknown>;

export interface MilkDailySummary {
	dailyLiters: number;
	milkRecords: number;
}

export interface ControlsPeriodSummary {
	monthlyControls: number;
	animalsNeedingAttention: number;
	healthyPercentage: number | null;
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
		if (!current || controlDate(row) > controlDate(current)) {
			latestByAnimal.set(animalId, row);
		}
	}

	const alertStatuses = new Set(["regular", "malo", "enfermo", "critico"]);
	const healthyStatuses = new Set(["excelente", "bueno", "sano"]);
	let animalsNeedingAttention = 0;
	let animalsWithKnownStatus = 0;
	let healthyAnimals = 0;

	for (const row of latestByAnimal.values()) {
		const status = normalizeStatus(row.health_status ?? row.healthStatus);
		if (alertStatuses.has(status)) animalsNeedingAttention += 1;
		if (alertStatuses.has(status) || healthyStatuses.has(status)) {
			animalsWithKnownStatus += 1;
		}
		if (healthyStatuses.has(status)) healthyAnimals += 1;
	}

	return {
		monthlyControls,
		animalsNeedingAttention,
		healthyPercentage: animalsWithKnownStatus
			? (healthyAnimals / animalsWithKnownStatus) * 100
			: null,
	};
}
