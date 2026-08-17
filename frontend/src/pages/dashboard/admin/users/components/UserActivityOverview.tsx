import {
	Activity,
	CalendarCheck2,
	Layers,
	PawPrint,
	Sparkles,
} from "lucide-react";
import type React from "react";
import { Loader2 } from "lucide-react";

interface UserActivityOverviewProps {
	fincaCount: number;
	totalActivities: number;
	recentEventsCount: number | null;
	distinctAnimalsCount: number | null;
	activeDaysCount: number | null;
	recentStatsDays: number;
	loading: boolean;
	hasRecentStats: boolean;
}

type Metric = {
	label: string;
	ariaLabel: string;
	value: number | null;
	icon: React.ComponentType<{ className?: string }>;
	iconClassName: string;
	note: string;
};

const numberFormatter = new Intl.NumberFormat("es-CO");

export const UserActivityOverview: React.FC<UserActivityOverviewProps> = ({
	fincaCount,
	totalActivities,
	recentEventsCount,
	distinctAnimalsCount,
	activeDaysCount,
	recentStatsDays,
	loading,
	hasRecentStats,
}) => {
	const metrics: Metric[] = [
		{
			label: "Predios vinculados",
			ariaLabel: "Predios vinculados",
			value: fincaCount,
			icon: Layers,
			iconClassName: "text-violet-500",
			note: "Membresías visibles",
		},
		{
			label: "Eventos históricos",
			ariaLabel: "Eventos históricos",
			value: totalActivities,
			icon: Activity,
			iconClassName: "text-primary",
			note: "Total registrado",
		},
		{
			label: `Eventos en los últimos ${recentStatsDays} días`,
			ariaLabel: `Eventos en los últimos ${recentStatsDays} días`,
			value: recentEventsCount,
			icon: Sparkles,
			iconClassName: "text-amber-500",
			note: "Actividad reciente",
		},
		{
			label: `Animales atendidos en los últimos ${recentStatsDays} días`,
			ariaLabel: `Animales atendidos en los últimos ${recentStatsDays} días`,
			value: distinctAnimalsCount,
			icon: PawPrint,
			iconClassName: "text-sky-500",
			note: "Animales distintos",
		},
		{
			label: `Días con actividad en los últimos ${recentStatsDays} días`,
			ariaLabel: `Días con actividad en los últimos ${recentStatsDays} días`,
			value: activeDaysCount,
			icon: CalendarCheck2,
			iconClassName: "text-emerald-500",
			note: "Frecuencia de uso",
		},
	];

	return (
		<section aria-labelledby="user-activity-overview-title" className="space-y-3">
			<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h3
						id="user-activity-overview-title"
						className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground"
					>
						<Activity size={16} className="text-primary" /> Resumen de actividad
					</h3>
					<p className="mt-1 text-xs text-muted-foreground">
						Indicadores para entender la vinculación y el uso real del sistema.
					</p>
				</div>
				<span className="text-[11px] font-semibold text-muted-foreground">
					{hasRecentStats ? `Ventana reciente: ${recentStatsDays} días` : "Resumen reciente no disponible"}
				</span>
			</div>

			<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">
				{metrics.map((metric) => {
					const Icon = metric.icon;
					return (
						<div
							key={metric.ariaLabel}
							role="group"
							aria-label={metric.ariaLabel}
							className="min-w-0 rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="flex items-start justify-between gap-3">
								<Icon className={`h-5 w-5 shrink-0 ${metric.iconClassName}`} />
								<span className="text-right text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
									{metric.note}
								</span>
							</div>
							<p className="mt-4 text-2xl font-black leading-none text-foreground">
								{loading && metric.value === null ? (
									<Loader2 className="h-5 w-5 animate-spin text-primary" />
								) : metric.value === null ? (
									"—"
								) : (
									numberFormatter.format(metric.value)
								)}
							</p>
							<p className="mt-2 min-h-[2.25rem] text-[11px] font-black uppercase leading-tight tracking-wide text-muted-foreground">
								{metric.label}
							</p>
						</div>
					);
				})}
			</div>
		</section>
	);
};
