import type React from "react";
import {
	Cloud,
	CloudLightning,
	CloudRain,
	Snowflake,
	Sun,
} from "lucide-react";

export const SEVERITY_CFG: Record<
	string,
	{
		label: string;
		color: string;
		bg: string;
		border: string;
		indicator: string;
	}
> = {
	low: {
		label: "Baja",
		color: "text-green-700 dark:text-green-300",
		bg: "bg-green-50 dark:bg-green-950/30",
		border: "border-green-300 dark:border-green-700",
		indicator: "bg-green-500",
	},
	medium: {
		label: "Media",
		color: "text-amber-700 dark:text-amber-300",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-300 dark:border-amber-700",
		indicator: "bg-amber-500",
	},
	high: {
		label: "Alta",
		color: "text-orange-700 dark:text-orange-300",
		bg: "bg-orange-50 dark:bg-orange-950/30",
		border: "border-orange-300 dark:border-orange-700",
		indicator: "bg-orange-500",
	},
	critical: {
		label: "Crítica",
		color: "text-red-700 dark:text-red-300",
		bg: "bg-red-50 dark:bg-red-950/30",
		border: "border-red-400 dark:border-red-700",
		indicator: "bg-red-600",
	},
};

export const WEATHER_ICONS: Record<string, React.ReactNode> = {
	clear: <Sun className="w-5 h-5 text-yellow-500" />,
	cloudy: <Cloud className="w-5 h-5 text-gray-500" />,
	rain: <CloudRain className="w-5 h-5 text-blue-500" />,
	storm: <CloudLightning className="w-5 h-5 text-purple-500" />,
	snow: <Snowflake className="w-5 h-5 text-cyan-400" />,
	fog: <Cloud className="w-5 h-5 text-gray-400" />,
};

export const WMO_DESCRIPTIONS: Record<number, string> = {
	0: "Despejado",
	1: "Mayormente despejado",
	2: "Parcialmente nublado",
	3: "Nublado",
	45: "Niebla",
	48: "Niebla con escarcha",
	51: "Llovizna ligera",
	53: "Llovizna moderada",
	55: "Llovizna densa",
	61: "Lluvia ligera",
	63: "Lluvia moderada",
	65: "Lluvia intensa",
	71: "Nieve ligera",
	73: "Nieve moderada",
	75: "Nieve intensa",
	77: "Granizo",
	80: "Chubascos ligeros",
	81: "Chubascos moderados",
	82: "Chubascos violentos",
	85: "Chubascos de nieve",
	86: "Chubascos de nieve intensos",
	95: "Tormenta",
	96: "Tormenta con granizo",
	99: "Tormenta con granizo intenso",
};

export function getWmoDescription(code: number | null): string {
	if (code === null || code === undefined) return "--";
	return WMO_DESCRIPTIONS[code] || "N/A";
}

export function formatHour(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleTimeString("es-CO", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatDay(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export function formatDayName(dateStr: string): string {
	const date = new Date(dateStr + "T12:00:00");
	return date.toLocaleDateString("es-CO", { weekday: "short" });
}

export function getDaysLeft(dateStr?: string | null): string | null {
	if (!dateStr) return null;
	const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
	if (diff < 0) return "Vencida";
	if (diff === 0) return "Vence hoy";
	return `Vence en ${diff} día${diff !== 1 ? "s" : ""}`;
}
