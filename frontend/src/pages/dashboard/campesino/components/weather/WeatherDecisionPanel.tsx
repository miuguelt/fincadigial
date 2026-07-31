import { Droplets, Leaf, ShieldAlert, Sprout, Wind } from "lucide-react";
import type { WeatherForecast, WeatherRecord } from "@/entities/weather";

interface Props {
	current: WeatherRecord | null;
	forecast: WeatherForecast | null;
}

interface Decision {
	title: string;
	detail: string;
	action: string;
	icon: typeof Leaf;
	 tone: "good" | "warning" | "critical";
}

function buildDecisions(current: WeatherRecord | null, forecast: WeatherForecast | null): Decision[] {
	const today = forecast?.daily?.[0];
	const tomorrow = forecast?.daily?.[1];
	const next24 = (forecast?.hourly || []).slice(0, 24);
	const rainProbability = Math.max(...next24.map((point) => point.precipitation_probability || 0), 0);
	const rainTotal = next24.reduce((sum, point) => sum + (point.precipitation_mm || 0), 0);
	const windMax = Math.max(today?.wind_gusts_max || 0, tomorrow?.wind_gusts_max || 0, current?.wind_speed_kmh || 0);
  const decisions: Decision[] = [];

	if (rainProbability >= 60 || rainTotal >= 5) {
		decisions.push({
			title: "Lluvia probable",
			detail: `${rainProbability}% de probabilidad en las próximas horas${rainTotal ? ` y hasta ${rainTotal.toFixed(1)} mm estimados` : ""}.`,
			action: "Prioriza drenajes y evita fumigar o trabajar suelo húmedo.",
			icon: Droplets,
			tone: "warning",
		});
	} else {
		decisions.push({
			title: "Ventana seca",
			detail: "No se observa lluvia significativa en las próximas 24 horas.",
			action: "Buen momento para labores de campo; revisa la humedad del suelo antes de regar.",
			icon: Sprout,
			tone: "good",
		});
	}

	if (windMax >= 25) {
		decisions.push({
			title: "Viento para vigilar",
			detail: `Ráfagas de hasta ${windMax.toFixed(0)} km/h en el horizonte cercano.`,
			action: "Asegura cubiertas y aplaza aplicaciones que puedan derivarse.",
			icon: Wind,
			tone: "warning",
		});
	}

	const maxTemp = today?.temp_max ?? current?.temperature_celsius ?? null;
	if (maxTemp != null && maxTemp >= 28 && rainProbability < 60) {
		decisions.push({
			title: "Demanda de agua alta",
			detail: `Máxima prevista de ${maxTemp.toFixed(1)}°C con poca lluvia inmediata.`,
			action: "Programa riego temprano o al final de la tarde y garantiza agua para el ganado.",
			icon: Leaf,
			tone: "warning",
		});
	}

	const uv = today?.uv_index ?? current?.uv_index ?? null;
	if (uv != null && uv >= 8) {
		decisions.push({
			title: "Radiación UV muy alta",
			detail: `Índice UV máximo previsto: ${uv.toFixed(0)}.`,
			action: "Protege al personal y evita exponer animales jóvenes en las horas centrales.",
			icon: ShieldAlert,
			tone: "critical",
		});
	}

	return decisions.slice(0, 4);
}

const toneConfig = {
	good: { badge: "bg-emerald-600 text-white", border: "border-emerald-300 dark:border-emerald-700", icon: "text-emerald-700 dark:text-emerald-300" },
	warning: { badge: "bg-amber-400 text-slate-950", border: "border-amber-300 dark:border-amber-700", icon: "text-amber-700 dark:text-amber-300" },
	critical: { badge: "bg-red-600 text-white", border: "border-red-300 dark:border-red-700", icon: "text-red-700 dark:text-red-300" },
};

export function WeatherDecisionPanel({ current, forecast }: Props) {
	const decisions = buildDecisions(current, forecast);
	if (!decisions.length) return null;

	return (
		<section className="space-y-3" aria-labelledby="weather-decisions-title">
			<div>
				<h2 id="weather-decisions-title" className="font-bold text-base">Decisiones para la jornada</h2>
				<p className="text-xs text-muted-foreground mt-0.5">Señales calculadas con el estado actual y el pronóstico local.</p>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{decisions.map((decision) => {
					const config = toneConfig[decision.tone];
					const Icon = decision.icon;
					return (
						<article key={decision.title} className={`bg-card rounded-lg border ${config.border} p-4 flex gap-3`}>
							<Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.icon}`} />
							<div className="min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<h3 className="font-bold text-sm">{decision.title}</h3>
									<span className={`text-[10px] rounded-full px-2 py-0.5 font-bold ${config.badge}`}>
										{decision.tone === "good" ? "Favorable" : decision.tone === "critical" ? "Prioridad" : "Vigilar"}
									</span>
								</div>
								<p className="text-xs text-muted-foreground mt-1">{decision.detail}</p>
								<p className="text-sm font-medium mt-2">{decision.action}</p>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
}
