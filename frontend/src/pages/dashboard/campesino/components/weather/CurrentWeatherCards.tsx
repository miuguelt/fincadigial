import {
	Cloud,
	CloudRain,
	Compass,
	Droplets,
	Gauge,
	Sun,
	Sunrise,
	Sunset,
	Thermometer,
	Wind,
} from "lucide-react";
import type { WeatherRecord } from "@/entities/weather";

interface Props {
	current: WeatherRecord | null;
}

function windDirectionLabel(degrees: number | null): string {
	if (degrees === null || degrees === undefined) return "--";
	const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
	const idx = Math.round(degrees / 45) % 8;
	return dirs[idx];
}

function uvLevel(uv: number | null): { label: string; color: string } {
	if (uv === null || uv === undefined) return { label: "--", color: "text-muted-foreground" };
	if (uv <= 2) return { label: "Bajo", color: "text-green-600" };
	if (uv <= 5) return { label: "Moderado", color: "text-yellow-600" };
	if (uv <= 7) return { label: "Alto", color: "text-orange-600" };
	if (uv <= 10) return { label: "Muy alto", color: "text-red-600" };
	return { label: "Extremo", color: "text-purple-600" };
}

function formatTime(timeStr: string | null): string | null {
	if (!timeStr) return null;
	try {
		const date = new Date(timeStr);
		return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
	} catch {
		return timeStr;
	}
}

export function CurrentWeatherCards({ current }: Props) {
	if (!current) return null;

	const uvInfo = uvLevel(current.uv_index);
	const sunrise = formatTime(current.sunrise_time);
	const sunset = formatTime(current.sunset_time);

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
				<div className="bg-card rounded-lg p-3 border border-border">
					<div className="flex items-center gap-1.5 mb-1.5">
						<Thermometer className="w-4 h-4 text-red-500" />
						<span className="text-[10px] text-muted-foreground">Temperatura</span>
					</div>
					<p className="text-xl font-bold">
						{current.temperature_celsius?.toFixed(1) || "--"}°C
					</p>
					{current.feels_like_celsius != null && (
						<p className="text-[10px] text-muted-foreground">
							Sensación: {current.feels_like_celsius.toFixed(1)}°C
						</p>
					)}
				</div>

				<div className="bg-card rounded-lg p-3 border border-border">
					<div className="flex items-center gap-1.5 mb-1.5">
						<Droplets className="w-4 h-4 text-blue-500" />
						<span className="text-[10px] text-muted-foreground">Humedad</span>
					</div>
					<p className="text-xl font-bold">
						{current.humidity_percent?.toFixed(0) || "--"}%
					</p>
				</div>

				<div className="bg-card rounded-lg p-3 border border-border">
					<div className="flex items-center gap-1.5 mb-1.5">
						<Wind className="w-4 h-4 text-cyan-500" />
						<span className="text-[10px] text-muted-foreground">Viento</span>
					</div>
					<p className="text-xl font-bold">
						{current.wind_speed_kmh?.toFixed(1) || "--"} <span className="text-xs font-normal">km/h</span>
					</p>
					{current.wind_direction_degrees != null && (
						<p className="text-[10px] text-muted-foreground flex items-center gap-1">
							<Compass className="w-3 h-3" />
							{windDirectionLabel(current.wind_direction_degrees)} ({current.wind_direction_degrees.toFixed(0)}°)
						</p>
					)}
				</div>

				<div className="bg-card rounded-lg p-3 border border-border">
					<div className="flex items-center gap-1.5 mb-1.5">
						<CloudRain className="w-4 h-4 text-indigo-500" />
						<span className="text-[10px] text-muted-foreground">Lluvia</span>
					</div>
					<p className="text-xl font-bold">
						{current.precipitation_mm?.toFixed(1) || "0"} <span className="text-xs font-normal">mm</span>
					</p>
				</div>

				<div className="bg-card rounded-lg p-3 border border-border">
					<div className="flex items-center gap-1.5 mb-1.5">
						<Gauge className="w-4 h-4 text-amber-500" />
						<span className="text-[10px] text-muted-foreground">Presión</span>
					</div>
					<p className="text-xl font-bold">
						{current.pressure_hpa?.toFixed(0) || "--"} <span className="text-xs font-normal">hPa</span>
					</p>
				</div>

				<div className="bg-card rounded-lg p-3 border border-border">
					<div className="flex items-center gap-1.5 mb-1.5">
						<Sun className="w-4 h-4 text-yellow-500" />
						<span className="text-[10px] text-muted-foreground">UV</span>
					</div>
					<p className="text-xl font-bold">
						{current.uv_index?.toFixed(0) || "--"}
					</p>
					<p className={`text-[10px] font-medium ${uvInfo.color}`}>
						{uvInfo.label}
					</p>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="bg-card rounded-lg p-3 border border-border">
					<div className="flex items-center gap-1.5 mb-1">
						<Cloud className="w-4 h-4 text-gray-400" />
						<span className="text-[10px] text-muted-foreground">Nubosidad</span>
					</div>
					<p className="text-lg font-bold">
						{current.cloud_cover_percent?.toFixed(0) || "--"}%
					</p>
				</div>

				{sunrise && (
					<div className="bg-card rounded-lg p-3 border border-border">
						<div className="flex items-center gap-1.5 mb-1">
							<Sunrise className="w-4 h-4 text-amber-500" />
							<span className="text-[10px] text-muted-foreground">Amanecer</span>
						</div>
						<p className="text-lg font-bold">{sunrise}</p>
					</div>
				)}

				{sunset && (
					<div className="bg-card rounded-lg p-3 border border-border">
						<div className="flex items-center gap-1.5 mb-1">
							<Sunset className="w-4 h-4 text-orange-500" />
							<span className="text-[10px] text-muted-foreground">Atardecer</span>
						</div>
						<p className="text-lg font-bold">{sunset}</p>
					</div>
				)}
			</div>

			{current.weather_condition && (
				<div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex items-center gap-3">
					{current.weather_condition === "clear" && <Sun className="w-6 h-6 text-yellow-500" />}
					{current.weather_condition === "cloudy" && <Cloud className="w-6 h-6 text-gray-500" />}
					{current.weather_condition === "rain" && <CloudRain className="w-6 h-6 text-blue-500" />}
					{current.weather_condition === "storm" && <CloudRain className="w-6 h-6 text-purple-500" />}
					<p className="text-sm font-medium text-sky-800 dark:text-sky-200 capitalize">
						Condición actual: {current.weather_condition}
					</p>
				</div>
			)}
		</div>
	);
}
