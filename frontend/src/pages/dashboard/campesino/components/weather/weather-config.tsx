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

// La traducción de códigos WMO vive en `entities/weather` para que el dashboard
// y esta página describan igual la misma condición.
export { WMO_DESCRIPTIONS, getWmoDescription } from "@/entities/weather";

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
