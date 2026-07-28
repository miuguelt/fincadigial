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
