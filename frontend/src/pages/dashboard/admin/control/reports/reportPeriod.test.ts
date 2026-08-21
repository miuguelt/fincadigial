import { describe, expect, it } from "vitest";
import {
	buildPeriodRange,
	eachDateInRange,
	isWithinRange,
} from "./reportPeriod";

describe("reportPeriod", () => {
	it("la semana son los últimos 7 días terminando hoy", () => {
		expect(buildPeriodRange("semana", "2026-08-17")).toEqual({
			period: "semana",
			start: "2026-08-11",
			end: "2026-08-17",
			label: "Últimos 7 días",
		});
	});

	it("el mes va del día 1 hasta hoy, no hasta fin de mes", () => {
		expect(buildPeriodRange("mes", "2026-08-17")).toEqual({
			period: "mes",
			start: "2026-08-01",
			end: "2026-08-17",
			label: "Mes en curso",
		});
	});

	it("cruza el cambio de mes sin perder días", () => {
		expect(buildPeriodRange("semana", "2026-03-02").start).toBe("2026-02-24");
	});

	it("acepta fechas con hora y descarta las que no son fechas", () => {
		const range = buildPeriodRange("semana", "2026-08-17");
		expect(isWithinRange("2026-08-11T23:00:00Z", range)).toBe(true);
		expect(isWithinRange("2026-08-10", range)).toBe(false);
		expect(isWithinRange("2026-08-18", range)).toBe(false);
		expect(isWithinRange("", range)).toBe(false);
	});

	it("enumera todos los días del rango, incluidos los vacíos", () => {
		const days = eachDateInRange(buildPeriodRange("semana", "2026-08-17"));
		expect(days).toHaveLength(7);
		expect(days[0]).toBe("2026-08-11");
		expect(days[6]).toBe("2026-08-17");
	});
});
