import { describe, expect, it } from "vitest";
import { milkEntrySchema } from "./milkEntryForm.schema";

const validEntry = {
	animal_id: 1,
	liters: 8.5,
	milking_session: "AM" as const,
	date: "2026-07-23",
};

describe("milkEntrySchema", () => {
	it("no convierte un campo de litros vacío en cero", () => {
		expect(
			milkEntrySchema.safeParse({ ...validEntry, liters: "" }).success,
		).toBe(false);
	});

	it("acepta un cero escrito explícitamente", () => {
		expect(milkEntrySchema.safeParse({ ...validEntry, liters: 0 }).success).toBe(
			true,
		);
	});
});
