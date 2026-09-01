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
			"border-red-500/30 bg-red-500/15 text-red-700 dark:border-red-400/30 dark:bg-red-500/20 dark:text-red-300",
		cardClass:
			"border-red-500/25 bg-gradient-to-br from-red-500/5 via-card to-card hover:border-red-500/40",
	},
	media: {
		badge: "En observación",
		hint: "Vuelve a mirarlo en estos días",
		badgeClass:
			"border-amber-500/30 bg-amber-500/15 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/20 dark:text-amber-300",
		cardClass:
			"border-amber-500/25 bg-gradient-to-br from-amber-500/5 via-card to-card hover:border-amber-500/40",
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
