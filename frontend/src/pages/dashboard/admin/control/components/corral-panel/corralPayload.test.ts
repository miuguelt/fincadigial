import { describe, expect, it } from "vitest";
import { buildCorralPayload } from "./corralPayload";

const baseValues = {
	animalId: 7,
	fincaId: 3,
	healthStatus: "Sano" as const,
	weight: "",
	milkLiters: "",
	isFemale: true,
	showRepro: false,
	reproEvent: "" as const,
	showTransfer: false,
	targetFieldId: "" as const,
	showTreatment: false,
	treatmentDesc: "",
	treatmentDosis: "",
	treatmentFrequency: "",
};

describe("buildCorralPayload", () => {
	it("exige una observación de salud explícita", () => {
		const result = buildCorralPayload({
			...baseValues,
			healthStatus: "",
		});

		expect(result.payload).toBeUndefined();
		expect(result.error?.title).toBe("Falta revisar la salud");
	});

	it("no inventa dosis ni frecuencia de tratamiento", () => {
		const result = buildCorralPayload({
			...baseValues,
			healthStatus: "Regular",
			showTreatment: true,
			treatmentDesc: "Vitamina",
		});

		expect(result.payload).toBeUndefined();
		expect(result.error?.title).toBe("Faltan datos del remedio");
	});

	it("envía exactamente los datos de tratamiento escritos", () => {
		const result = buildCorralPayload({
			...baseValues,
			healthStatus: "Malo",
			showTreatment: true,
			treatmentDesc: "Antibiótico",
			treatmentDosis: "10 ml",
			treatmentFrequency: "Cada 12 horas",
		});

		expect(result.payload).toMatchObject({
			treatment_description: "Antibiótico",
			treatment_dosis: "10 ml",
			treatment_frequency: "Cada 12 horas",
		});
	});

	it("omite leche y reproducción si el animal es macho", () => {
		const result = buildCorralPayload({
			...baseValues,
			isFemale: false,
			milkLiters: "8",
			showRepro: true,
			reproEvent: "Celo",
		});

		expect(result.payload).not.toHaveProperty("milk_liters");
		expect(result.payload).not.toHaveProperty("reproduction_event");
	});

	it("exige escoger el tipo de novedad reproductiva", () => {
		const result = buildCorralPayload({
			...baseValues,
			showRepro: true,
		});

		expect(result.payload).toBeUndefined();
		expect(result.error?.title).toBe("Falta escoger la novedad");
	});

	it("exige escoger destino cuando se activa el traslado", () => {
		const result = buildCorralPayload({
			...baseValues,
			showTransfer: true,
		});

		expect(result.payload).toBeUndefined();
		expect(result.error?.title).toBe("Falta escoger el potrero");
	});
});
