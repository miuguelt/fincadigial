export const STATUS_CONFIG: Record<
	string,
	{ label: string; emoji: string; color: string; border: string; bg: string }
> = {
	planned: {
		label: "Planificada",
		emoji: "🟡",
		color: "text-amber-700 dark:text-amber-300",
		border: "border-amber-300 dark:border-amber-700",
		bg: "bg-amber-50 dark:bg-amber-950/30",
	},
	active: {
		label: "Activa",
		emoji: "🟢",
		color: "text-emerald-700 dark:text-emerald-300",
		border: "border-emerald-300 dark:border-emerald-700",
		bg: "bg-emerald-50 dark:bg-emerald-950/30",
	},
	harvested: {
		label: "Cosechada",
		emoji: "🔵",
		color: "text-blue-700 dark:text-blue-300",
		border: "border-blue-300 dark:border-blue-700",
		bg: "bg-blue-50 dark:bg-blue-950/30",
	},
	lost: {
		label: "Perdida",
		emoji: "🔴",
		color: "text-red-700 dark:text-red-300",
		border: "border-red-300 dark:border-red-700",
		bg: "bg-red-50 dark:bg-red-950/30",
	},
};

export const CROP_EMOJIS: Record<string, string> = {
	maiz: "🌽",
	maíz: "🌽",
	yuca: "🥔",
	cafe: "☕",
	café: "☕",
	pasto: "🌿",
	platano: "🍌",
	plátano: "🍌",
	tomate: "🍅",
	papa: "🥔",
	frijol: "🫘",
	fríjol: "🫘",
	caña: "🎋",
	arroz: "🌾",
	cacao: "🍫",
	aguacate: "🥑",
	mora: "🍇",
	limon: "🍋",
	limón: "🍋",
};

export function getCropEmoji(cropName?: string): string {
	if (!cropName) return "🌱";
	const lower = cropName.toLowerCase();
	for (const [key, emoji] of Object.entries(CROP_EMOJIS)) {
		if (lower.includes(key)) return emoji;
	}
	return "🌾";
}

export function getDaysToHarvest(
	dateStr?: string,
): { days: number; label: string; urgent: boolean } | null {
	if (!dateStr) return null;
	const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
	if (diff < 0)
		return { days: diff, label: `Hace ${Math.abs(diff)} días`, urgent: true };
	if (diff === 0) return { days: 0, label: "¡Hoy!", urgent: true };
	return { days: diff, label: `En ${diff} días`, urgent: diff <= 7 };
}

export const FILTER_OPTIONS = [
	{ key: "all", label: "Todas", emoji: "🌿" },
	{ key: "active", label: "Activas", emoji: "🟢" },
	{ key: "planned", label: "Planificadas", emoji: "🟡" },
	{ key: "harvested", label: "Cosechadas", emoji: "🔵" },
	{ key: "lost", label: "Perdidas", emoji: "🔴" },
];

export type FormStep = 1 | 2 | 3;

export interface CropPlotFormData {
	name: string;
	crop_name: string;
	variety: string;
	area: string;
	area_unit: string;
	field_id: string;
	sowing_date: string;
	expected_harvest_date: string;
	status: string;
	seed_source: string;
	notes: string;
}

export const INITIAL_CROP_PLOT_FORM: CropPlotFormData = {
	name: "",
	crop_name: "",
	variety: "",
	area: "",
	area_unit: "ha",
	field_id: "",
	sowing_date: "",
	expected_harvest_date: "",
	status: "active",
	seed_source: "",
	notes: "",
};
