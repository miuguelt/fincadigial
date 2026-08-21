import { describe, expect, it } from "vitest";
import {
	extractControlRows,
	summarizeControls,
	summarizeDailyMilk,
	summarizeWeeklyMilk,
} from "./controlSummary.utils";

describe("controlSummary.utils", () => {
	it("extrae resúmenes de leche desde payloads anidados y aliases", () => {
		expect(
			summarizeDailyMilk({
				data: { totalLiters: "18.5", recordCount: "3" },
			}),
		).toEqual({
			dailyLiters: 18.5,
			milkRecords: 3,
		});
		expect(
			summarizeWeeklyMilk({
				data: { avg_daily_liters: "12.25" },
			}),
		).toBe(12.25);
	});

	it.each([
		["data directo", { data: [{ id: 1 }] }],
		["items raíz", { items: [{ id: 1 }] }],
		["results raíz", { results: [{ id: 1 }] }],
		["items anidado", { data: { items: [{ id: 1 }] } }],
		["results anidado", { data: { results: [{ id: 1 }] } }],
	])("extrae filas desde %s", (_name, payload) => {
		expect(extractControlRows(payload)).toEqual([{ id: 1 }]);
	});

	it("cuenta únicamente los controles del mes indicado", () => {
		const summary = summarizeControls(
			[
				{
					animal_id: 1,
					checkup_date: "2026-07-01",
					health_status: "Bueno",
				},
				{
					animal_id: 2,
					checkupDate: "2026-07-31T20:00:00Z",
					healthStatus: "Sano",
				},
				{
					animal_id: 3,
					control_date: "2026-06-30",
					health_status: "Excelente",
				},
			],
			"2026-07-23",
		);

		expect(summary.monthlyControls).toBe(2);
	});

	it("usa solamente el estado más reciente de cada animal", () => {
		const summary = summarizeControls(
			[
				{
					animal_id: 1,
					checkup_date: "2026-07-01",
					health_status: "Malo",
				},
				{
					animal_id: 1,
					checkup_date: "2026-07-20",
					health_status: "Bueno",
				},
				{
					animalId: 2,
					controlDate: "2026-07-02",
					healthStatus: "Sano",
				},
				{
					animalId: 2,
					controlDate: "2026-07-21",
					healthStatus: "Regular",
				},
				{
					animal_id: 3,
					created_at: "2026-07-22T08:00:00",
					health_status: "Crítico",
				},
			],
			"2026-07-23",
		);

		expect(summary.animalsNeedingAttention).toBe(2);
		expect(summary.healthyPercentage).toBeCloseTo(100 / 3);
	});

	it("lista qué animales necesitan atención, no solo cuántos", () => {
		const summary = summarizeControls(
			[
				{
					animal_id: 1,
					checkup_date: "2026-07-20",
					health_status: "Regular",
					description: "Cojea de la pata derecha",
				},
				{
					animal_id: 2,
					checkup_date: "2026-07-08",
					health_status: "Malo",
					description: "No come",
				},
				{ animal_id: 3, checkup_date: "2026-07-22", health_status: "Bueno" },
			],
			"2026-07-23",
		);

		expect(summary.attentionAnimals).toEqual([
			{
				animalId: 2,
				status: "Malo",
				severity: "alta",
				lastCheckDate: "2026-07-08",
				daysSinceCheck: 15,
				description: "No come",
			},
			{
				animalId: 1,
				status: "Regular",
				severity: "media",
				lastCheckDate: "2026-07-20",
				daysSinceCheck: 3,
				description: "Cojea de la pata derecha",
			},
		]);
	});

	it("dentro de la misma gravedad prioriza el control más viejo sin seguimiento", () => {
		const summary = summarizeControls(
			[
				{ animal_id: 1, checkup_date: "2026-07-22", health_status: "Malo" },
				{ animal_id: 2, checkup_date: "2026-07-02", health_status: "Enfermo" },
				{ animal_id: 3, checkup_date: "2026-07-15", health_status: "Crítico" },
			],
			"2026-07-23",
		);

		expect(summary.attentionAnimals.map((animal) => animal.animalId)).toEqual([
			2, 3, 1,
		]);
	});

	it("solo considera el último control de cada animal en la lista de atención", () => {
		const summary = summarizeControls(
			[
				{ animal_id: 1, checkup_date: "2026-07-01", health_status: "Malo" },
				{ animal_id: 1, checkup_date: "2026-07-20", health_status: "Bueno" },
				{ animal_id: 2, checkup_date: "2026-07-01", health_status: "Bueno" },
				{ animal_id: 2, checkup_date: "2026-07-21", health_status: "Malo" },
			],
			"2026-07-23",
		);

		expect(summary.attentionAnimals.map((animal) => animal.animalId)).toEqual([
			2,
		]);
		expect(summary.attentionAnimals[0].daysSinceCheck).toBe(2);
	});

	it("no inventa días transcurridos cuando la fecha no es legible", () => {
		const [animal] = summarizeControls(
			[{ animal_id: 1, checkup_date: "sin fecha", health_status: "Malo" }],
			"2026-07-23",
		).attentionAnimals;

		expect(animal.daysSinceCheck).toBeNull();
		expect(animal.lastCheckDate).toBe("");
	});

	it("cuando hay múltiples controles en la misma fecha, selecciona el más reciente por created_at o id", () => {
		const summary = summarizeControls(
			[
				{
					id: 10,
					animal_id: 1,
					checkup_date: "2026-07-23",
					health_status: "Regular",
					description: "Observación anterior",
					created_at: "2026-07-23T08:00:00Z",
				},
				{
					id: 11,
					animal_id: 1,
					checkup_date: "2026-07-23",
					health_status: "Bueno",
					description: "Revisado hoy, recuperado",
					created_at: "2026-07-23T14:00:00Z",
				},
			],
			"2026-07-23",
		);

		expect(summary.animalsNeedingAttention).toBe(0);
		expect(summary.attentionAnimals).toEqual([]);
		expect(summary.healthyPercentage).toBe(100);
	});

	it("retorna porcentaje null cuando no hay estados conocidos", () => {
		expect(summarizeControls([], "2026-07-23").healthyPercentage).toBeNull();
		expect(
			summarizeControls(
				[
					{
						animal_id: 1,
						checkup_date: "2026-07-10",
						health_status: "Sin revisar",
					},
				],
				"2026-07-23",
			).healthyPercentage,
		).toBeNull();
	});
});
