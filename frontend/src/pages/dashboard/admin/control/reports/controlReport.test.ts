import { describe, expect, it } from "vitest";
import {
	buildHealthBreakdown,
	buildWeighingReport,
	findAnimalsWithoutRecentCheck,
} from "./controlReport";
import { buildPeriodRange } from "./reportPeriod";

const rows = [
	{ animal_id: 1, checkup_date: "2026-08-16", health_status: "Bueno", weight: 320 },
	{ animal_id: 2, checkup_date: "2026-08-15", health_status: "Regular", weight: 280 },
	{ animal_id: 3, checkup_date: "2026-08-14", health_status: "Malo" },
	{ animal_id: 4, checkup_date: "2026-06-01", health_status: "Sano" },
	{ animal_id: 5, checkup_date: "2026-08-12", health_status: "Sin definir" },
];

describe("buildHealthBreakdown", () => {
	it("clasifica el último estado de cada animal en sanos, observación y graves", () => {
		const breakdown = buildHealthBreakdown(rows);

		expect(breakdown.total).toBe(5);
		expect(breakdown.buckets).toEqual([
			{ key: "sano", label: "Sanos", count: 2, percentage: 40 },
			{ key: "observacion", label: "En observación", count: 1, percentage: 20 },
			{ key: "grave", label: "Graves", count: 1, percentage: 20 },
			{ key: "desconocido", label: "Sin estado claro", count: 1, percentage: 20 },
		]);
	});

	it("no reparte porcentajes cuando no hay animales", () => {
		const breakdown = buildHealthBreakdown([]);
		expect(breakdown.total).toBe(0);
		expect(breakdown.buckets.every((bucket) => bucket.percentage === 0)).toBe(true);
	});
});

describe("findAnimalsWithoutRecentCheck", () => {
	it("lista los animales cuyo último control supera el umbral, del más viejo al más nuevo", () => {
		const stale = findAnimalsWithoutRecentCheck(rows, "2026-08-17", 30);

		expect(stale).toEqual([{ animalId: 4, daysSinceCheck: 77 }]);
	});

	it("usa el control más reciente de cada animal, no el primero que aparezca", () => {
		const stale = findAnimalsWithoutRecentCheck(
			[
				{ animal_id: 9, checkup_date: "2026-01-01", health_status: "Bueno" },
				{ animal_id: 9, checkup_date: "2026-08-16", health_status: "Bueno" },
			],
			"2026-08-17",
			30,
		);

		expect(stale).toEqual([]);
	});
});

describe("buildWeighingReport", () => {
	it("resume los pesajes del periodo", () => {
		const report = buildWeighingReport(rows, buildPeriodRange("semana", "2026-08-17"));

		expect(report.count).toBe(2);
		expect(report.animals).toBe(2);
		expect(report.averageWeight).toBe(300);
	});

	it("devuelve promedio nulo cuando nadie se pesó en el periodo", () => {
		const report = buildWeighingReport(
			[{ animal_id: 1, checkup_date: "2026-01-05", weight: 400 }],
			buildPeriodRange("semana", "2026-08-17"),
		);

		expect(report.count).toBe(0);
		expect(report.averageWeight).toBeNull();
	});
});
