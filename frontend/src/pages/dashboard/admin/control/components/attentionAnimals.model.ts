import type {
	AttentionAnimal,
	AttentionSeverity,
} from "../hooks/controlSummary.utils";

/** Animal en alerta con la etiqueta que ve el operario (registro o alias). */
export interface AttentionAnimalView extends AttentionAnimal {
	label: string;
}

export interface AttentionSeverityCopy {
	/** Texto de la insignia: el color nunca es el único indicador. */
	badge: string;
	/** Qué hacer, en una línea, sin jerga veterinaria. */
	hint: string;
	badgeClass: string;
	cardClass: string;
}

export const ATTENTION_SEVERITY_COPY: Record<
	AttentionSeverity,
	AttentionSeverityCopy
> = {
	alta: {
		badge: "Grave",
		hint: "Revísalo hoy mismo",
		badgeClass:
			"bg-red-700 text-white dark:bg-red-600",
		cardClass:
			"border-red-300 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30",
	},
	media: {
		badge: "En observación",
		hint: "Vuelve a mirarlo en estos días",
		badgeClass:
			"bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950",
		cardClass:
			"border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30",
	},
};

/** Frase para el operario; nunca inventa un número si no hay fecha. */
export function describeLastCheck(daysSinceCheck: number | null): string {
	if (daysSinceCheck === null) return "Sin fecha de revisión";
	if (daysSinceCheck <= 0) return "Revisado hoy";
	if (daysSinceCheck === 1) return "Revisado ayer";
	return `Revisado hace ${daysSinceCheck} días`;
}

/** Título del panel, ya conjugado en singular o plural. */
export function describeAttentionCount(total: number): string {
	if (total === 1) return "1 animal necesita atención";
	return `${total} animales necesitan atención`;
}

/**
 * Une la lista de alertas con los nombres de animales. Cuando el catálogo aún
 * no cargó se muestra el número de identificación, no una fila en blanco.
 */
export function buildAttentionViews(
	animals: AttentionAnimal[],
	labelOf: (animalId: number) => string | undefined,
): AttentionAnimalView[] {
	return animals.map((animal) => ({
		...animal,
		label: labelOf(animal.animalId) || `Animal ${animal.animalId}`,
	}));
}
