import { describe, expect, it } from "vitest";
import { buildReportCsv, buildReportText } from "./reportExport";
import type { ReportSnapshot } from "./reportExport";
import { buildPeriodRange } from "./reportPeriod";

const snapshot: ReportSnapshot = {
	range: buildPeriodRange("semana", "2026-08-17"),
	milk: {
		totalLiters: 157.5,
		dailyAverage: 52.5,
		daysWithRecords: 3,
		bestDay: { date: "2026-08-16", liters: 62.5, animals: 10 },
		litersPerAnimal: 14.32,
		points: [
			{ date: "2026-08-16", liters: 62.5, animals: 10 },
			{ date: "2026-08-17", liters: 55, animals: 9 },
		],
		unavailable: false,
	},
	health: {
		total: 5,
		buckets: [
			{ key: "sano", label: "Sanos", count: 2, percentage: 40 },
			{ key: "observacion", label: "En observación", count: 1, percentage: 20 },
			{ key: "grave", label: "Graves", count: 1, percentage: 20 },
			{ key: "desconocido", label: "Sin estado claro", count: 1, percentage: 20 },
		],
	},
	weighing: { count: 2, animals: 2, averageWeight: 300 },
	staleCount: 4,
};

describe("buildReportText", () => {
	it("resume el periodo en frases que el operario puede enviar por mensaje", () => {
		const text = buildReportText(snapshot);

		expect(text).toContain("Villa Luz · Últimos 7 días (11/08/2026 a 17/08/2026)");
		expect(text).toContain("Leche: 157,5 L en total, 52,5 L por día");
		expect(text).toContain("Mejor día: 16/08/2026 con 62,5 L");
		expect(text).toContain("Salud: 2 sanos, 1 en observación, 1 graves");
		expect(text).toContain("4 animales llevan más de 30 días sin revisión");
		expect(text).toContain("Pesajes: 2 en 2 animales, promedio 300 kg");
	});

	it("dice que no hay datos de ordeño en vez de reportar cero litros", () => {
		const text = buildReportText({
			...snapshot,
			milk: { ...snapshot.milk, unavailable: true },
		});

		expect(text).toContain("Leche: sin datos disponibles");
		expect(text).not.toContain("0 L en total");
	});
});

describe("buildReportCsv", () => {
	it("usa punto y coma y coma decimal para que Excel en Colombia lo abra bien", () => {
		const lines = buildReportCsv(snapshot).split("\n");

		expect(lines[0]).toBe("fecha;litros;animales_ordeñados");
		expect(lines[1]).toBe("2026-08-16;62,5;10");
		expect(lines[2]).toBe("2026-08-17;55;9");
	});
});
