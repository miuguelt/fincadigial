import * as z from "zod";

export const milkEntrySchema = z.object({
	animal_id: z.number().min(1, "Seleccione una vaca"),
	liters: z.preprocess(
		(value) => (value === "" || value === undefined ? undefined : Number(value)),
		z
			.number({
				required_error: "Anote cuántos litros recogió",
				invalid_type_error: "Escriba una cantidad válida",
			})
			.min(0, "Los litros no pueden ser negativos")
			.max(80, "El máximo permitido es 80 litros"),
	),
	milking_session: z.enum(["AM", "PM", "Extra"]),
	date: z.string().min(1, "Seleccione la fecha del ordeño"),
	fat_percentage: z
		.number()
		.min(0, "El porcentaje no puede ser negativo")
		.max(100, "El porcentaje no puede superar 100")
		.optional(),
	protein_percentage: z
		.number()
		.min(0, "El porcentaje no puede ser negativo")
		.max(100, "El porcentaje no puede superar 100")
		.optional(),
	somatic_cells: z
		.number()
		.min(0, "El conteo no puede ser negativo")
		.max(1_000_000, "El conteo no puede superar 1.000.000")
		.optional(),
	notes: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export type MilkEntryFormValues = z.infer<typeof milkEntrySchema>;

export interface MilkEntryFormWidgetProps {
	onSuccess?: () => void;
	defaultDate?: string;
	onCancel?: () => void;
}
