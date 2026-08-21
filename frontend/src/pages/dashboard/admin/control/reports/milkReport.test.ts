import { describe, expect, it } from "vitest";
import { buildMilkReport } from "./milkReport";
import { buildPeriodRange } from "./reportPeriod";

const range = buildPeriodRange("semana", "2026-08-17");

const payload = {
	data: {
		daily_breakdown: [
			{ date: "2026-08-15", total_liters: 40, animal_count: 8 },
			{ date: "2026-08-16", total_liters: 62.5, animal_count: 10 },
			{ date: "2026-08-17", total_liters: 55, animal_count: 9 },
		],
		animal_count: 11,
	},
};

describe("buildMilkReport", () => {
	it("resume litros del periodo y señala el mejor día", () => {
		const report = buildMilkReport(payload, range);

		expect(report.totalLiters).toBe(157.5);
		expect(report.daysWithRecords).toBe(3);
		expect(report.dailyAverage).toBeCloseTo(52.5);
		expect(report.bestDay).toEqual({
			date: "2026-08-16",
			liters: 62.5,
			animals: 10,
		});
	});

	it("promedia por animal usando los animales distintos del periodo", () => {
		expect(buildMilkReport(payload, range).litersPerAnimal).toBeCloseTo(
			157.5 / 11,
		);
	});

	it("grafica todos los días del rango, con cero en los días sin ordeño", () => {
		const report = buildMilkReport(payload, range);

		expect(report.points).toHaveLength(7);
		expect(report.points[0]).toEqual({
			date: "2026-08-11",
			liters: 0,
			animals: 0,
		});
		expect(report.points[5].liters).toBe(62.5);
	});

	it("descarta días del API que quedan fuera del rango pedido", () => {
		const report = buildMilkReport(
			{ data: { daily_breakdown: [{ date: "2026-08-01", total_liters: 99 }] } },
			range,
		);

		expect(report.totalLiters).toBe(0);
		expect(report.points.every((point) => point.liters === 0)).toBe(true);
	});

	it("marca el reporte como no disponible cuando la fuente falló", () => {
		const report = buildMilkReport(null, range);

		expect(report.unavailable).toBe(true);
		expect(report.totalLiters).toBe(0);
		expect(report.bestDay).toBeNull();
	});

	it("no divide por cero cuando no hay ordeños registrados", () => {
		const report = buildMilkReport({ data: { daily_breakdown: [] } }, range);

		expect(report.unavailable).toBe(false);
		expect(report.dailyAverage).toBe(0);
		expect(report.litersPerAnimal).toBeNull();
	});
});
