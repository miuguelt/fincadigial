import { z } from "zod";

export const profileSchema = z.object({
	fullname: z
		.string()
		.min(3, "Ingresa al menos 3 caracteres")
		.max(120, "Nombre demasiado largo"),
	email: z.string().email("Correo electrónico inválido"),
	phone: z
		.string()
		.optional()
		.refine(
			(value) => !value || /^[0-9+()\\-\\s]{7,20}$/.test(value),
			"Teléfono inválido",
		),
	address: z.string().max(160, "Dirección demasiado larga").optional(),
});

export const passwordSchema = z
	.object({
		currentPassword: z.string().min(4, "Ingresa tu contraseña actual"),
		newPassword: z
			.string()
			.min(8, "La contraseña debe tener al menos 8 caracteres")
			.superRefine((value, ctx) => {
				const hasUppercase = /[A-Z]/.test(value);
				const hasLowercase = /[a-z]/.test(value);

				if (!hasUppercase || !hasLowercase) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Debe incluir al menos 1 mayúscula y 1 minúscula.",
					});
				}
			}),
		confirmPassword: z.string(),
	})
	.superRefine((data, ctx) => {
		if (data.newPassword !== data.confirmPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Las contraseñas no coinciden",
				path: ["confirmPassword"],
			});
		}
	});

/**
 * Acreditación profesional del veterinario.
 *
 * Solo datos público-profesionales cotejables contra COMVEZCOL y SNIES. Los
 * campos opcionales admiten cadena vacía porque el formulario los envía así
 * cuando el usuario los deja en blanco.
 */
const optionalText = (max: number, message: string) =>
	z.string().max(max, message).optional().or(z.literal(""));

export const professionalCredentialSchema = z.object({
	title: z.enum(
		["Médico Veterinario", "Médico Veterinario y Zootecnista", "Zootecnista"],
		{ errorMap: () => ({ message: "Selecciona tu título profesional" }) },
	),
	professional_card_number: z
		.string()
		.min(4, "La matrícula debe tener al menos 4 caracteres")
		.max(20, "La matrícula no puede superar 20 caracteres")
		.regex(
			/^[A-Za-z0-9\-\s]+$/,
			"La matrícula solo admite letras, números o guiones",
		),
	issuing_authority: optionalText(80, "Entidad demasiado larga"),
	card_issued_at: z
		.string()
		.optional()
		.or(z.literal(""))
		.refine(
			(value) => !value || new Date(value) <= new Date(),
			"La fecha de expedición no puede ser futura",
		),
	university: z
		.string()
		.min(3, "Ingresa la universidad donde obtuviste el título")
		.max(160, "Nombre de universidad demasiado largo"),
	graduation_year: z
		.string()
		.optional()
		.or(z.literal(""))
		.refine((value) => {
			if (!value) return true;
			const year = Number(value);
			return (
				Number.isInteger(year) &&
				year >= 1950 &&
				year <= new Date().getFullYear()
			);
		}, `El año de grado debe estar entre 1950 y ${new Date().getFullYear()}`),
	specialization: optionalText(200, "Especialización demasiado larga"),
	ica_registration: optionalText(60, "Registro ICA demasiado largo"),
	practice_areas: optionalText(255, "Áreas de práctica demasiado largas"),
	liability_insurer: optionalText(120, "Nombre de aseguradora demasiado largo"),
	liability_policy_number: optionalText(60, "Número de póliza demasiado largo"),
	liability_expires_at: z.string().optional().or(z.literal("")),
	// La autorización es el fundamento legal de toda la recolección: sin ella no
	// se guarda nada (Ley 1581 de 2012). Se modela como boolean —no como literal
	// true— para que el checkbox pueda desmarcarse y el mensaje de error aparezca.
	consent_accepted: z.boolean().refine((value) => value === true, {
		message:
			"Debes autorizar el tratamiento de tus datos profesionales para continuar",
	}),
	sworn_declaration: z.boolean().refine((value) => value === true, {
		message:
			"Debes declarar que la información es veraz para registrar la acreditación",
	}),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PasswordFormValues = z.infer<typeof passwordSchema>;
export type ProfessionalCredentialFormValues = z.infer<
	typeof professionalCredentialSchema
>;

export type BubbleVariant = "success" | "error" | "info" | "warning";

export type PasswordStatus = {
	type: BubbleVariant;
	title: string;
	message: string;
};
