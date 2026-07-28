import { describe, expect, it } from "vitest";
import { getMilkDateRange, getMilkMonthParts } from "./milkPeriod.utils";

describe("milkPeriod.utils", () => {
	it("calcula la semana de lunes a domingo sin usar fechas del navegador", () => {
		expect(getMilkDateRange("week", "2026-07-25")).toEqual({
			date_from: "2026-07-20",
			date_to: "2026-07-25",
		});
	});

	it("calcula el mes y conserva el día de consulta", () => {
		expect(getMilkDateRange("month", "2026-07-25")).toEqual({
			date_from: "2026-07-01",
			date_to: "2026-07-25",
		});
		expect(getMilkMonthParts("2026-07-25")).toEqual({ year: 2026, month: 7 });
	});
});
