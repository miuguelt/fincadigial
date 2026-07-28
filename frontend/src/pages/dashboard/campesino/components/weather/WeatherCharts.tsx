import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { WeatherRecord } from "@/entities/weather";
import { formatDay, formatHour } from "./weather-config";

interface Props {
	history: WeatherRecord[];
}

export function WeatherCharts({ history }: Props) {
	const chartData = history.map((r) => ({
		time: formatHour(r.recorded_at),
		day: formatDay(r.recorded_at),
		temperature: r.temperature_celsius,
		humidity: r.humidity_percent,
		wind: r.wind_speed_kmh,
		precipitation: r.precipitation_mm,
		pressure: r.pressure_hpa,
		cloudCover: r.cloud_cover_percent,
	}));

	if (chartData.length === 0) return null;

	const tooltipStyle = {
		backgroundColor: "hsl(var(--card))",
		border: "1px solid hsl(var(--border))",
		borderRadius: "8px",
	};

	return (
		<div className="space-y-4">
			<div className="bg-card rounded-lg p-4 border border-border">
				<h3 className="font-bold text-sm mb-4">
					Temperatura, Rocío y Humedad
				</h3>
				<ResponsiveContainer width="100%" height={250}>
					<AreaChart data={chartData}>
						<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
						<XAxis dataKey="time" tick={{ fontSize: 10 }} />
						<YAxis yAxisId="temp" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
						<YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} />
						<Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
						<Area
							yAxisId="temp"
							type="monotone"
							dataKey="temperature"
							stroke="hsl(var(--chart-1))"
							fill="hsl(var(--chart-1))"
							fillOpacity={0.2}
							name="Temp °C"
						/>
						<Area
							yAxisId="humidity"
							type="monotone"
							dataKey="humidity"
							stroke="hsl(var(--chart-2))"
							fill="hsl(var(--chart-2))"
							fillOpacity={0.1}
							name="Humedad %"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-card rounded-lg p-4 border border-border">
					<h3 className="font-bold text-sm mb-4">Viento y Ráfagas</h3>
					<ResponsiveContainer width="100%" height={200}>
						<LineChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
							<XAxis dataKey="time" tick={{ fontSize: 10 }} />
							<YAxis tick={{ fontSize: 10 }} />
							<Tooltip contentStyle={tooltipStyle} />
							<Line
								type="monotone"
								dataKey="wind"
								stroke="hsl(var(--chart-3))"
								strokeWidth={2}
								dot={false}
								name="Viento km/h"
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>

				<div className="bg-card rounded-lg p-4 border border-border">
					<h3 className="font-bold text-sm mb-4">Precipitación</h3>
					<ResponsiveContainer width="100%" height={200}>
						<BarChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
							<XAxis dataKey="time" tick={{ fontSize: 10 }} />
							<YAxis tick={{ fontSize: 10 }} />
							<Tooltip contentStyle={tooltipStyle} />
							<Bar
								dataKey="precipitation"
								fill="#6366f1"
								radius={[2, 2, 0, 0]}
								name="Precipitación mm"
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>

			<div className="bg-card rounded-lg p-4 border border-border">
				<h3 className="font-bold text-sm mb-4">Presión y Nubosidad</h3>
				<ResponsiveContainer width="100%" height={200}>
					<LineChart data={chartData}>
						<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
						<XAxis dataKey="time" tick={{ fontSize: 10 }} />
						<YAxis yAxisId="pressure" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
						<YAxis yAxisId="cloud" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} />
						<Tooltip contentStyle={tooltipStyle} />
						<Line
							yAxisId="pressure"
							type="monotone"
							dataKey="pressure"
							stroke="#f59e0b"
							strokeWidth={2}
							dot={false}
							name="Presión hPa"
						/>
						<Area
							yAxisId="cloud"
							type="monotone"
							dataKey="cloudCover"
							stroke="#94a3b8"
							fill="#94a3b8"
							fillOpacity={0.15}
							name="Nubosidad %"
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
