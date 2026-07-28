import { describe, expect, it } from "vitest";
import { formatControlPageDate, parseDateOnlyLocal } from "./controlPage.utils";

describe("controlPage.utils", () => {
	it("interpreta la fecha del control como fecha local sin retroceder por UTC", () => {
		const date = parseDateOnlyLocal("2026-07-23T23:59:59.000Z");

		expect(date).not.toBeNull();
		expect(date?.getFullYear()).toBe(2026);
		expect(date?.getMonth()).toBe(6);
		expect(date?.getDate()).toBe(23);
		expect(date?.getHours()).toBe(0);
	});

	it("formatea el día esperado en español de Colombia", () => {
		const formatted = formatControlPageDate("2026-07-23");

		expect(formatted).toContain("Hoy, jueves");
		expect(formatted).toContain("23 de julio de 2026");
	});

	it("retorna un mensaje claro cuando la fecha no está disponible", () => {
		expect(parseDateOnlyLocal("")).toBeNull();
		expect(parseDateOnlyLocal("2026-02-31")).toBeNull();
		expect(formatControlPageDate("")).toBe("Fecha no disponible");
	});
});
