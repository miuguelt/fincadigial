export const OFFER_TYPES = [
	{
		value: "sale",
		label: "Venta",
		emoji: "🏷️",
		color:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
		border: "border-green-300 dark:border-green-700",
		grad: "from-green-500 to-emerald-600",
	},
	{
		value: "purchase",
		label: "Compra",
		emoji: "🛒",
		color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
		border: "border-blue-300 dark:border-blue-700",
		grad: "from-blue-500 to-indigo-600",
	},
	{
		value: "exchange",
		label: "Trueque",
		emoji: "🔄",
		color:
			"bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
		border: "border-amber-300 dark:border-amber-700",
		grad: "from-amber-500 to-orange-600",
	},
] as const;

export const PRODUCT_EMOJIS: Record<string, string> = {
	leche: "🥛",
	café: "☕",
	cafe: "☕",
	maiz: "🌽",
	maíz: "🌽",
	yuca: "🥔",
	tomate: "🍅",
	papa: "🥔",
	platano: "🍌",
	plátano: "🍌",
	ganado: "🐄",
	carne: "🥩",
	frijol: "🫘",
	arroz: "🌾",
	huevo: "🥚",
	huevos: "🥚",
	miel: "🍯",
	cacao: "🍫",
	aguacate: "🥑",
	mora: "🍇",
};

export function getProductEmoji(name: string): string {
	if (!name) return "📦";
	const l = name.toLowerCase();
	for (const [k, e] of Object.entries(PRODUCT_EMOJIS))
		if (l.includes(k)) return e;
	return "🛍️";
}

export function getOfferCfg(type: string) {
	return OFFER_TYPES.find((t) => t.value === type) ?? OFFER_TYPES[0];
}

export const FILTER_OFFER_OPTIONS = [
	{ key: "all", label: "Todas", emoji: "🛍️" },
	{ key: "sale", label: "Venta", emoji: "🏷️" },
	{ key: "purchase", label: "Compra", emoji: "🛒" },
	{ key: "exchange", label: "Trueque", emoji: "🔄" },
];

export interface MarketOfferFormData {
	product_name: string;
	offer_type: string;
	quantity: string;
	unit: string;
	price: string;
	currency: string;
	contact_name: string;
	contact_phone: string;
	delivery_location: string;
	available_until: string;
	status: string;
	notes: string;
}

export const INITIAL_MARKET_OFFER_FORM: MarketOfferFormData = {
	product_name: "",
	offer_type: "sale",
	quantity: "",
	unit: "",
	price: "",
	currency: "COP",
	contact_name: "",
	contact_phone: "",
	delivery_location: "",
	available_until: "",
	status: "active",
	notes: "",
};
