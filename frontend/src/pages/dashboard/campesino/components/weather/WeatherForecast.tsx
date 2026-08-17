import { motion } from "framer-motion";
import { CloudRain, Droplets, Sunrise, Sunset, Thermometer, Wind } from "lucide-react";
import type { WeatherForecastDay } from "@/entities/weather";
import { getWmoDescription } from "./weather-config";

interface Props {
	forecast: WeatherForecastDay[];
}

export function WeatherForecast({ forecast }: Props) {
	if (!forecast || forecast.length === 0) return null;

	const today = forecast[0];
	const upcoming = forecast.slice(1);

	return (
		<div className="space-y-4">
			<h2 className="font-bold text-base">Pronóstico 7 días</h2>

			{today && (
				<div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 rounded-lg p-4 border border-sky-200 dark:border-sky-800">
					<div className="flex items-center gap-2 mb-3">
						<Thermometer className="w-4 h-4 text-sky-600" />
						<span className="font-bold text-sm text-sky-800 dark:text-sky-200">Hoy</span>
						<span className="text-xs text-sky-600 dark:text-sky-400">
							{new Date(today.date + "T12:00:00").toLocaleDateString("es-CO", {
								day: "numeric",
								month: "long",
							})}
						</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div className="flex items-center gap-2">
							<Thermometer className="w-4 h-4 text-red-400 shrink-0" />
							<div>
								<p className="text-xs text-muted-foreground">Máx / Mín</p>
								<p className="text-sm font-bold">
									{today.temp_max?.toFixed(0) || "--"}° / {today.temp_min?.toFixed(0) || "--"}°
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Droplets className="w-4 h-4 text-blue-400 shrink-0" />
							<div>
								<p className="text-xs text-muted-foreground">Humedad</p>
								<p className="text-sm font-bold">{today.humidity_avg?.toFixed(0) || "--"}%</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<CloudRain className="w-4 h-4 text-indigo-400 shrink-0" />
							<div>
								<p className="text-xs text-muted-foreground">Precipitación</p>
								<p className="text-sm font-bold">{today.precipitation_mm?.toFixed(1) || "0"}mm</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Wind className="w-4 h-4 text-cyan-400 shrink-0" />
							<div>
								<p className="text-xs text-muted-foreground">Viento máx</p>
								<p className="text-sm font-bold">{today.wind_max?.toFixed(0) || "--"} km/h</p>
							</div>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
						{today.sunrise && (
							<span className="flex items-center gap-1">
								<Sunrise className="w-3.5 h-3.5 text-amber-500" />
								{new Date(today.sunrise).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
							</span>
						)}
						{today.sunset && (
							<span className="flex items-center gap-1">
								<Sunset className="w-3.5 h-3.5 text-orange-500" />
								{new Date(today.sunset).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
							</span>
						)}
						{today.uv_index != null && (
							<span>UV máx: {today.uv_index.toFixed(0)}</span>
						)}
						<span className="capitalize">{getWmoDescription(today.weather_code)}</span>
					</div>
				</div>
			)}

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
				{upcoming.map((day, i) => (
					<motion.div
						key={day.date}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.05 }}
						className="bg-card rounded-lg p-3 border border-border text-center"
					>
						<p className="text-xs font-bold text-muted-foreground capitalize">
							{new Date(day.date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short" })}
						</p>
						<p className="text-[11px] text-muted-foreground mb-2">
							{new Date(day.date + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
						</p>
						<div className="flex justify-center gap-1 text-sm font-bold">
							<span className="text-red-500">{day.temp_max?.toFixed(0) || "--"}°</span>
							<span className="text-muted-foreground">/</span>
							<span className="text-blue-500">{day.temp_min?.toFixed(0) || "--"}°</span>
						</div>
						{day.precipitation_mm != null && day.precipitation_mm > 0 && (
							<p className="text-[11px] text-blue-500 mt-1 flex items-center justify-center gap-0.5">
								<Droplets className="w-3 h-3" />
								{day.precipitation_mm.toFixed(1)}mm
							</p>
						)}
						{day.wind_max != null && (
							<p className="text-[11px] text-cyan-500 flex items-center justify-center gap-0.5">
								<Wind className="w-3 h-3" />
								{day.wind_max.toFixed(0)} km/h
							</p>
						)}
						<p className="text-[11px] text-muted-foreground mt-1 capitalize fit-clamp">
							{getWmoDescription(day.weather_code)}
						</p>
					</motion.div>
				))}
			</div>
		</div>
	);
}
