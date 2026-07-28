import { TrendingUp } from "lucide-react";
import type React from "react";

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
		<div className="bg-card/40 border border-border/40 p-3.5 rounded-xl space-y-1 transition-all hover:bg-card/60 hover:shadow-sm">
			<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
				{label}
			</div>
			<div className={`text-lg font-black ${color} flex items-baseline gap-1`}>
				{value}
				{unit && (
					<span className="text-xs font-semibold text-muted-foreground">
						{unit}
					</span>
				)}
			</div>
			<div className="text-[9px] text-muted-foreground leading-tight">
				{sub}
			</div>
		</div>
	);

	return (
		<div className="bg-gradient-to-br from-card/80 to-background border border-border/80 rounded-2xl p-5 shadow-lg shadow-primary/5 space-y-4">
			<div className="flex items-center gap-3 border-b border-border/40 pb-3">
				<div className="p-2 bg-primary/10 rounded-lg text-primary">
					<TrendingUp className="h-5 w-5 animate-pulse" />
				</div>
				<div>
					<h3 className="text-xs font-black uppercase tracking-wider text-foreground">
						Rendimiento y Métricas 360°
					</h3>
					<p className="text-[10px] text-muted-foreground font-medium mt-0.5">
						Análisis consolidado en tiempo real basado en controles y
						trazabilidad
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
				{gdpStats && (
					<StatCard
						label="Ganancia Diaria (GDP)"
						value={`+${gdpStats.gdp}`}
						unit="kg/dia"
						sub={`Ganó ${gdpStats.weightDiff} kg en ${gdpStats.daysDiff} días de control.`}
						color="text-emerald-600 dark:text-emerald-400"
					/>
				)}
				{daysInCurrentField !== null && (
					<StatCard
						label="Estancia Actual"
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
