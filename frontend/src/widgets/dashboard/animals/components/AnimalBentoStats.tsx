import { TrendingUp } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/ui/cn";

interface GdpStats {
	gdp: string;
	weightDiff: string;
	daysDiff: number;
}

interface AnimalBentoStatsProps {
	gdpStats: GdpStats | null;
	daysInCurrentField: number | null;
	totalRotations: number;
	totalVaccinations: number;
	totalTreatments: number;
	activeDiseasesCount: number;
	curedDiseasesCount: number;
}

export function AnimalBentoStats({
	gdpStats,
	daysInCurrentField,
	totalRotations,
	totalVaccinations,
	totalTreatments,
	activeDiseasesCount,
	curedDiseasesCount,
}: AnimalBentoStatsProps) {
	const hasStats =
		gdpStats ||
		daysInCurrentField !== null ||
		totalRotations > 0 ||
		totalVaccinations > 0 ||
		totalTreatments > 0 ||
		activeDiseasesCount > 0 ||
		curedDiseasesCount > 0;
	if (!hasStats) return null;

	const StatCard = ({
		label,
		value,
		unit,
		sub,
		color,
	}: {
		label: string;
		value: React.ReactNode;
		unit?: string;
		sub: string;
		color: string;
	}) => (
		<div className="bg-background/70 dark:bg-card/50 border border-border/60 p-3.5 rounded-xl space-y-1.5 transition-all hover:border-primary/40 hover:shadow-sm">
			<div className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
				{label}
			</div>
			<div className={cn("text-xl font-black flex items-baseline gap-1.5 tabular-nums tracking-tight", color)}>
				{value}
				{unit && (
					<span className="text-xs font-semibold text-muted-foreground">
						{unit}
					</span>
				)}
			</div>
			<div className="text-[11px] text-muted-foreground font-medium leading-snug">
				{sub}
			</div>
		</div>
	);

	return (
		<div className="bg-card/70 dark:bg-card/40 border border-border/70 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 backdrop-blur-sm">
			<div className="flex items-center gap-3 border-b border-border/50 pb-3">
				<div className="h-8 w-8 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shadow-sm">
					<TrendingUp className="h-4 w-4" />
				</div>
				<div>
					<h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
						Rendimiento y Métricas 360°
					</h3>
					<p className="text-[11px] text-muted-foreground font-medium mt-0.5">
						Análisis consolidado en tiempo real basado en controles y trazabilidad
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
				{gdpStats && (
					<StatCard
						label="Ganancia Diaria (GDP)"
						value={`+${gdpStats.gdp}`}
						unit="kg/día"
						sub={`Ganó ${gdpStats.weightDiff} kg en ${gdpStats.daysDiff} días de control.`}
						color="text-emerald-600 dark:text-emerald-400"
					/>
				)}
				{daysInCurrentField !== null && (
					<StatCard
						label="Días en Potrero"
						value={daysInCurrentField}
						unit="días"
						sub={`En potrero actual. Rotado ${totalRotations} ${totalRotations === 1 ? "vez" : "veces"} en total.`}
						color="text-amber-600 dark:text-amber-400"
					/>
				)}
				{totalRotations > 0 && daysInCurrentField === null && (
					<StatCard
						label="Rotación de Potreros"
						value={totalRotations}
						unit={totalRotations === 1 ? "Traslado" : "Traslados"}
						sub="Movimientos totales registrados en el ganado."
						color="text-blue-600 dark:text-blue-400"
					/>
				)}
				{(totalVaccinations > 0 || totalTreatments > 0) && (
					<StatCard
						label="Trazabilidad Médica"
						value={totalVaccinations + totalTreatments}
						unit="Eventos"
						sub={`${totalVaccinations} vacunas y ${totalTreatments} tratamientos aplicados.`}
						color="text-purple-600 dark:text-purple-400"
					/>
				)}
				{(activeDiseasesCount > 0 || curedDiseasesCount > 0) && (
					<StatCard
						label="Carga Sanitaria"
						value={activeDiseasesCount}
						unit="Activas"
						sub={`${curedDiseasesCount} enfermedades superadas con éxito.`}
						color="text-rose-600 dark:text-rose-400"
					/>
				)}
			</div>
		</div>
	);
}
