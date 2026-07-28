export const SEVERITY_CFG = {
	low: {
		label: "Baja",
		emoji: "🟢",
		color: "text-green-700 dark:text-green-300",
		bg: "bg-green-50 dark:bg-green-950/30",
		border: "border-green-300 dark:border-green-700",
		indicator: "bg-green-500",
	},
	medium: {
		label: "Media",
		emoji: "🟡",
		color: "text-amber-700 dark:text-amber-300",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-300 dark:border-amber-700",
		indicator: "bg-amber-500",
	},
	high: {
		label: "Alta",
		emoji: "🟠",
		color: "text-orange-700 dark:text-orange-300",
		bg: "bg-orange-50 dark:bg-orange-950/30",
		border: "border-orange-300 dark:border-orange-700",
		indicator: "bg-orange-500",
	},
	critical: {
		label: "Crítica",
		emoji: "🔴",
		color: "text-red-700 dark:text-red-300",
		bg: "bg-red-50 dark:bg-red-950/30",
		border: "border-red-400 dark:border-red-700",
		indicator: "bg-red-600",
	},
} as const;

export const RISK_TYPES = [
	{ value: "Helada", emoji: "🥶", label: "Helada" },
	{ value: "Sequía", emoji: "☀️", label: "Sequía" },
	{ value: "Inundación", emoji: "🌊", label: "Inundación" },
	{ value: "Plaga", emoji: "🐛", label: "Plaga" },
	{ value: "Viento fuerte", emoji: "💨", label: "Viento Fuerte" },
	{ value: "Granizo", emoji: "🧊", label: "Granizo" },
	{ value: "Otro", emoji: "⚠️", label: "Otro" },
];

export function getRiskEmoji(riskType?: string): string {
	if (!riskType) return "⚠️";
	const found = RISK_TYPES.find((r) =>
		riskType.toLowerCase().includes(r.value.toLowerCase()),
	);
	return found?.emoji ?? "⚠️";
}

export function getDaysLeft(dateStr?: string): string | null {
	if (!dateStr) return null;
	const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
	if (diff < 0) return "Vencida";
	if (diff === 0) return "Vence hoy";
	return `Vence en ${diff} día${diff !== 1 ? "s" : ""}`;
}

export type SeverityKey = keyof typeof SEVERITY_CFG;

export const FILTER_SEVERITY_OPTIONS = [
	{ key: "all", label: "Todas", emoji: "⚠️" },
	{ key: "critical", label: "Crítica", emoji: "🔴" },
	{ key: "high", label: "Alta", emoji: "🟠" },
	{ key: "medium", label: "Media", emoji: "🟡" },
	{ key: "low", label: "Baja", emoji: "🟢" },
];

export interface ClimateAlertFormData {
	title: string;
	risk_type: string;
	severity: string;
	description: string;
	recommendation: string;
	valid_from: string;
	valid_until: string;
	source: string;
	is_active: boolean;
}

export const INITIAL_CLIMATE_ALERT_FORM: ClimateAlertFormData = {
	title: "",
	risk_type: "",
	severity: "medium",
	description: "",
	recommendation: "",
	valid_from: "",
	valid_until: "",
	source: "Observación local",
	is_active: true,
};
