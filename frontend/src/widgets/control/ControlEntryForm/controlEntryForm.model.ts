import { z } from "zod";
import type {
	ControlInput,
	HealthStatus,
} from "@/shared/api/generated/swaggerTypes";
import type {
	ControlEntryFormValues,
	ControlEntryMode,
	ControlEntryModeCopy,
} from "./ControlEntryForm.types";

const HEALTH_STATUSES = [
	"Excelente",
	"Bueno",
	"Regular",
	"Malo",
	"Sano",
] as const;

const optionalPositiveNumber = (message: string) =>
	z.number().positive(message).optional();

export const MODE_COPY: Record<ControlEntryMode, ControlEntryModeCopy> = {
	weight: {
		submitLabel: "Guardar peso",
		successMessage: "Peso guardado correctamente",
		errorMessage: "No se pudo guardar el peso",
	},
	health: {
		submitLabel: "Guardar novedad",
		successMessage: "Novedad guardada correctamente",
		errorMessage: "No se pudo guardar la novedad",
	},
	full: {
		submitLabel: "Registrar Control",
		successMessage: "Control registrado correctamente",
		errorMessage: "Error al registrar control",
	},
};

export function getControlEntrySchema(
	mode: ControlEntryMode,
): z.ZodType<ControlEntryFormValues> {
	const healthStatus = z
		.union([z.enum(HEALTH_STATUSES), z.literal("")])
		.refine(Boolean, "Indique cómo se veía el animal");

	return z.object({
		animal_id: z.number().min(1, "Selecciona un animal"),
		checkup_date: z.string().min(1, "Selecciona la fecha"),
		weight:
			mode === "weight"
				? z.number().positive("El peso debe ser mayor a 0")
				: optionalPositiveNumber("El peso debe ser mayor a 0"),
		height: optionalPositiveNumber("La altura debe ser mayor a 0"),
		health_status: healthStatus,
		description: z.string().max(500).optional(),
	}) as z.ZodType<ControlEntryFormValues>;
}

export function getControlEntryDefaults(
	_mode: ControlEntryMode,
	checkupDate: string,
): Partial<ControlEntryFormValues> {
	return {
		checkup_date: checkupDate,
		health_status: "",
	};
}

export function buildControlEntryPayload(
	data: ControlEntryFormValues,
	mode: ControlEntryMode,
): ControlInput {
	const base: ControlInput = {
		animal_id: data.animal_id,
		checkup_date: data.checkup_date,
	};

	if (mode === "weight") {
		return {
			...base,
			weight: data.weight,
			health_status: data.health_status as HealthStatus,
		};
	}

	const payload: ControlInput = {
		...base,
		health_status: data.health_status as HealthStatus,
	};
	if (data.description) payload.description = data.description;
	if (mode === "full") {
		if (data.weight) payload.weight = data.weight;
		if (data.height) payload.height = data.height;
	}
	return payload;
}
