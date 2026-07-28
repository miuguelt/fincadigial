import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ControlEntryFormWidget } from "./ControlEntryFormWidget";
import {
	buildControlEntryPayload,
	getControlEntrySchema,
} from "./controlEntryForm.model";

vi.mock("@/app/providers/ToastContext", () => ({
	useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/entities/animal/model/useAnimals", () => ({
	useAnimals: () => ({
		animals: [{ id: 7, record: "VL-007", alias: "Luna" }],
		loading: false,
	}),
}));

vi.mock("@/entities/control/api/control.service", () => ({
	controlService: { create: vi.fn() },
}));

describe("ControlEntryFormWidget", () => {
	it("muestra únicamente los campos del pesaje", () => {
		render(<ControlEntryFormWidget mode="weight" />);

		expect(screen.getByLabelText("Animal")).toBeInTheDocument();
		expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
		expect(screen.getByLabelText("Peso (kg)")).toBeInTheDocument();
		expect(
			screen.getByRole("group", {
				name: "¿Cómo se veía el animal?",
			}),
		).toBeInTheDocument();
		for (const name of ["Normal", "Decaído", "Enfermo"]) {
			expect(screen.getByRole("radio", { name })).not.toBeChecked();
		}
		expect(
			screen.getByRole("button", { name: "Guardar peso" }),
		).toBeInTheDocument();
		expect(screen.queryByLabelText("Estado de salud")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Altura (m)")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Observaciones")).not.toBeInTheDocument();
	});

	it("muestra únicamente los campos de la novedad de salud", () => {
		render(<ControlEntryFormWidget mode="health" />);

		expect(screen.getByLabelText("Animal")).toBeInTheDocument();
		expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
		expect(screen.getByLabelText("Estado de salud")).toBeInTheDocument();
		expect(screen.getByLabelText("Observaciones")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Guardar novedad" }),
		).toBeInTheDocument();
		expect(screen.queryByLabelText("Peso (kg)")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Altura (m)")).not.toBeInTheDocument();
	});

	it("conserva el formulario completo como modo predeterminado", () => {
		render(<ControlEntryFormWidget />);

		expect(screen.getByLabelText("Estado de salud")).toBeInTheDocument();
		expect(screen.getByLabelText("Peso (kg)")).toBeInTheDocument();
		expect(screen.getByLabelText("Altura (m)")).toBeInTheDocument();
		expect(
			screen.getByLabelText("Tratamientos u observaciones"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Registrar Control" }),
		).toBeInTheDocument();
	});

	it("exige peso positivo y una observación real en el pesaje", () => {
		const result = getControlEntrySchema("weight").safeParse({
			animal_id: 7,
			checkup_date: "2026-07-23",
			weight: 420,
			health_status: "",
		});

		expect(result.success).toBe(false);
	});

	it("envía la observación elegida en el payload de peso", () => {
		const payload = buildControlEntryPayload(
			{
				animal_id: 7,
				checkup_date: "2026-07-23",
				weight: 420,
				health_status: "Regular",
			},
			"weight",
		);

		expect(payload).toEqual({
			animal_id: 7,
			checkup_date: "2026-07-23",
			weight: 420,
			health_status: "Regular",
		});
	});
});
