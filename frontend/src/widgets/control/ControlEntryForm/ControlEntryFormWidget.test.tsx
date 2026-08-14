import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ControlEntryFormWidget } from "./ControlEntryFormWidget";
import {
	CONTROL_DESCRIPTION_MAX_LENGTH,
	buildControlEntryPayload,
	getControlEntrySchema,
} from "./controlEntryForm.model";
import { controlService } from "@/entities/control/api/control.service";

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
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("muestra únicamente los campos del pesaje", () => {
		render(<ControlEntryFormWidget mode="weight" />);

		expect(screen.getByLabelText("Animal")).toBeInTheDocument();
		expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
		expect(screen.getByLabelText("Peso en kilogramos")).toBeInTheDocument();
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
		expect(screen.queryByLabelText("Altura en metros")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Observaciones")).not.toBeInTheDocument();
	});

	it("muestra únicamente los campos de la novedad de salud", () => {
		render(<ControlEntryFormWidget mode="health" />);

		expect(screen.getByLabelText("Animal")).toBeInTheDocument();
		expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
		expect(screen.getByRole("group", { name: "¿Cómo está el animal?" })).toBeInTheDocument();
		expect(screen.getByLabelText("¿Qué observaste? (opcional)")).toBeInTheDocument();
		expect(screen.getByLabelText("¿Qué observaste? (opcional)")).toHaveAttribute(
			"maxlength",
			String(CONTROL_DESCRIPTION_MAX_LENGTH),
		);
		expect(
			screen.getByRole("button", { name: "Guardar novedad" }),
		).toBeInTheDocument();
		expect(screen.queryByLabelText("Peso en kilogramos")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Altura en metros")).not.toBeInTheDocument();
	});

	it("conserva el formulario completo como modo predeterminado", () => {
		render(<ControlEntryFormWidget />);

		expect(screen.getByLabelText("Estado de salud")).toBeInTheDocument();
		expect(screen.getByLabelText("Peso en kilogramos")).toBeInTheDocument();
		expect(screen.getByLabelText("Altura en metros")).toBeInTheDocument();
		expect(
			screen.getByLabelText("Tratamientos u observaciones"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Guardar revisión" }),
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

	it("envía una novedad de salud y confirma el guardado", async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const create = vi.mocked(controlService.create);

		render(<ControlEntryFormWidget mode="health" onSuccess={onSuccess} />);
		const nativeAnimalSelect = document.querySelector("select") as HTMLSelectElement;
		fireEvent.change(nativeAnimalSelect, { target: { value: "7" } });
		await user.click(screen.getByRole("radio", { name: "Normal" }));
		await user.click(screen.getByRole("button", { name: "Guardar novedad" }));

		await waitFor(() => {
			expect(create).toHaveBeenCalledWith({
				animal_id: 7,
				checkup_date: expect.any(String),
				health_status: "Sano",
			});
			expect(onSuccess).toHaveBeenCalledOnce();
		});
	});
});
