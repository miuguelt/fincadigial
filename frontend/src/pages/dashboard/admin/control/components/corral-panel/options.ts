import type { HealthStatus, ReproductionEvent } from "./types";

interface HealthOption {
	id: HealthStatus;
	label: string;
	description: string;
	icon: string;
	selectedClass: string;
}

interface ReproductionOption {
	id: Exclude<ReproductionEvent, "">;
	label: string;
	icon: string;
}

export const HEALTH_OPTIONS: HealthOption[] = [
	{
		id: "Excelente",
		label: "Muy bien",
		description: "Activo y comiendo bien",
		icon: "🌟",
		selectedClass:
			"bg-green-100 border-green-500 text-green-900 ring-green-500",
	},
	{
		id: "Sano",
		label: "Normal",
		description: "Sin cambios ni señales raras",
		icon: "✅",
		selectedClass:
			"bg-emerald-100 border-emerald-500 text-emerald-900 ring-emerald-500",
	},
	{
		id: "Regular",
		label: "Decaído",
		description: "Se ve diferente o sin ánimo",
		icon: "⚠️",
		selectedClass:
			"bg-yellow-100 border-yellow-500 text-yellow-900 ring-yellow-500",
	},
	{
		id: "Malo",
		label: "Enfermo",
		description: "Necesita atención",
		icon: "🚨",
		selectedClass: "bg-red-100 border-red-500 text-red-900 ring-red-500",
	},
];

export const REPRODUCTION_OPTIONS: ReproductionOption[] = [
	{ id: "Celo", label: "Celo", icon: "🔥" },
	{ id: "Inseminacion", label: "Inseminación", icon: "💉" },
	{ id: "Diagnostico", label: "Diagnóstico", icon: "👨‍⚕️" },
	{ id: "Parto", label: "Parto", icon: "🍼" },
];
