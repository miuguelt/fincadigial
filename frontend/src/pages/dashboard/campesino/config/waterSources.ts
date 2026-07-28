export const SOURCE_TYPES = [
	{
		value: "stream",
		label: "Quebrada/Río",
		emoji: "🏞️",
		color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		border: "border-blue-300 dark:border-blue-700",
	},
	{
		value: "well",
		label: "Pozo",
		emoji: "🪣",
		color:
			"bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300",
		border: "border-stone-300 dark:border-stone-600",
	},
	{
		value: "reservoir",
		label: "Reservorio",
		emoji: "💦",
		color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
		border: "border-cyan-300 dark:border-cyan-700",
	},
	{
		value: "rainwater",
		label: "Agua Lluvia",
		emoji: "🌧️",
		color:
			"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
		border: "border-indigo-300 dark:border-indigo-700",
	},
	{
		value: "public_supply",
		label: "Acueducto",
		emoji: "🚰",
		color:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		border: "border-green-300 dark:border-green-700",
	},
	{
		value: "other",
		label: "Otro",
		emoji: "💧",
		color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
		border: "border-gray-300 dark:border-gray-700",
	},
] as const;

export const RELIABILITY_CFG: Record<string, { label: string; color: string }> =
	{
		high: { label: "Alta", color: "text-green-600 dark:text-green-400" },
		medium: { label: "Media", color: "text-amber-600 dark:text-amber-400" },
		low: { label: "Baja", color: "text-red-600 dark:text-red-400" },
		seasonal: {
			label: "Estacional",
			color: "text-blue-600 dark:text-blue-400",
		},
	};

export function getSourceCfg(type: string) {
	return SOURCE_TYPES.find((t) => t.value === type) ?? SOURCE_TYPES[5];
}

export const RELIABILITY_OPTIONS = [
	{ value: "high", label: "Alta", emoji: "🟢" },
	{ value: "medium", label: "Media", emoji: "🟡" },
	{ value: "low", label: "Baja", emoji: "🔴" },
	{ value: "seasonal", label: "Estacional", emoji: "🔵" },
];

export interface WaterSourceFormData {
	name: string;
	source_type: string;
	capacity_liters: string;
	is_potable: boolean;
	reliability: string;
	notes: string;
}

export const INITIAL_WATER_SOURCE_FORM: WaterSourceFormData = {
	name: "",
	source_type: "other",
	capacity_liters: "",
	is_potable: false,
	reliability: "",
	notes: "",
};
