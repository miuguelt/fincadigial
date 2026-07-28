export const ACTIVITY_TYPES = [
	{
		value: "sowing",
		label: "Siembra",
		emoji: "🌱",
		color:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		border: "border-green-300 dark:border-green-700",
	},
	{
		value: "irrigation",
		label: "Riego",
		emoji: "💧",
		color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		border: "border-blue-300 dark:border-blue-700",
	},
	{
		value: "fertilization",
		label: "Fertilización",
		emoji: "🧪",
		color:
			"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
		border: "border-amber-300 dark:border-amber-700",
	},
	{
		value: "pest_control",
		label: "Control Plagas",
		emoji: "🐛",
		color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
		border: "border-red-300 dark:border-red-700",
	},
	{
		value: "harvest",
		label: "Cosecha",
		emoji: "🌾",
		color:
			"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
		border: "border-yellow-300 dark:border-yellow-700",
	},
	{
		value: "note",
		label: "Nota/Observación",
		emoji: "📋",
		color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
		border: "border-gray-300 dark:border-gray-700",
	},
] as const;

export function getActivityCfg(type: string) {
	return ACTIVITY_TYPES.find((t) => t.value === type) ?? ACTIVITY_TYPES[5];
}

export interface CropActivityFormData {
	crop_plot_id: string;
	activity_type: string;
	activity_date: string;
	description: string;
	input_name: string;
	quantity: string;
	unit: string;
	cost: string;
	notes: string;
}

export const INITIAL_CROP_ACTIVITY_FORM: CropActivityFormData = {
	crop_plot_id: "",
	activity_type: "note",
	activity_date: new Date().toISOString().split("T")[0],
	description: "",
	input_name: "",
	quantity: "",
	unit: "",
	cost: "",
	notes: "",
};
