import {
	ClipboardList,
	Heart,
	type LucideIcon,
	Milk,
	RefreshCw,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { ControlsSummary } from "../hooks/useControlsSummary";
import { TaskIndicator } from "./TaskIndicator";

interface DailyOverviewProps {
	summary: ControlsSummary;
	canRecord: boolean;
	onRegisterMilk: () => void;
	onShowHealth: () => void;
}

interface MetricCardProps {
	icon: LucideIcon;
	label: string;
	value: string;
	help: string;
}

const NUMBER_FORMAT = new Intl.NumberFormat("es-CO", {
	maximumFractionDigits: 1,
});

function MetricCard({ icon: Icon, label, value, help }: MetricCardProps) {
	return (
		<div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between gap-2">
				<p className="text-sm font-semibold leading-tight text-muted-foreground">
					{label}
				</p>
				<Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
			</div>
			<p className="mt-2 break-words text-2xl font-black tabular-nums text-foreground">
				{value}
			</p>
			<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
				{help}
			</p>
		</div>
	);
}

export function DailyOverview({
	summary,
	canRecord,
	onRegisterMilk,
	onShowHealth,
}: DailyOverviewProps) {
	const milkKnown = !summary.milkUnavailable && summary.milkRecords !== null;
	const controlsKnown =
		!summary.controlsUnavailable && summary.animalsNeedingAttention !== null;
	const hasIssue = summary.milkUnavailable || summary.controlsUnavailable;
	const unavailableHelp = summary.loading
		? "Cargando este dato..."
		: "No pudimos cargar este dato.";
	const missingValue = summary.loading ? "…" : "—";

	return (
		<div className="space-y-5" aria-busy={summary.loading}>
			{hasIssue && (
				<div
					role="status"
					className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
				>
					<p className="text-sm">
						No pudimos cargar una parte del resumen. Sus registros no se
						cambiaron.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={summary.refresh}
						disabled={summary.loading}
						className="min-h-11 shrink-0"
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${summary.loading ? "animate-spin" : ""}`}
							aria-hidden="true"
						/>
						Volver a intentar
					</Button>
				</div>
			)}

			<section aria-labelledby="pending-title" className="space-y-2">
				<h2 id="pending-title" className="text-lg font-bold text-foreground">
					Pendientes de hoy
				</h2>
				<TaskIndicator
					canRecord={canRecord}
					milkKnown={milkKnown}
					controlsKnown={controlsKnown}
					noMilkToday={milkKnown && summary.milkRecords === 0}
					hasSickAnimals={
						controlsKnown && Number(summary.animalsNeedingAttention) > 0
					}
					sickAnimals={summary.animalsNeedingAttention ?? 0}
					onRegisterMilk={onRegisterMilk}
					onScrollToHealth={onShowHealth}
				/>
			</section>

			<section aria-labelledby="summary-title" className="space-y-3">
				<div>
					<h2 id="summary-title" className="text-lg font-bold text-foreground">
						Resumen de la finca
					</h2>
					<p className="text-sm text-muted-foreground">
						Datos guardados en el sistema para el periodo indicado.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
					<MetricCard
						icon={Milk}
						label="Leche registrada hoy"
						value={
							summary.dailyLiters === null
								? missingValue
								: `${NUMBER_FORMAT.format(summary.dailyLiters)} L`
						}
						help={
							summary.dailyLiters === null
								? unavailableHelp
								: summary.weeklyAverage === null
									? "Total anotado hoy."
									: `Promedio de esta semana: ${NUMBER_FORMAT.format(summary.weeklyAverage)} L por día.`
						}
					/>
					<MetricCard
						icon={ClipboardList}
						label="Registros de ordeño"
						value={
							summary.milkRecords === null
								? missingValue
								: NUMBER_FORMAT.format(summary.milkRecords)
						}
						help={
							summary.milkRecords === null
								? unavailableHelp
								: "Incluye mañana, tarde y ordeños extra."
						}
					/>
					<MetricCard
						icon={ClipboardList}
						label="Revisiones este mes"
						value={
							summary.monthlyControls === null
								? missingValue
								: NUMBER_FORMAT.format(summary.monthlyControls)
						}
						help={
							summary.monthlyControls === null
								? unavailableHelp
								: summary.monthlyControls === 0
									? "Todavía no hay revisiones este mes."
									: "Registros de salud y peso."
						}
					/>
					<MetricCard
						icon={Heart}
						label="Animales por revisar"
						value={
							summary.animalsNeedingAttention === null
								? missingValue
								: NUMBER_FORMAT.format(summary.animalsNeedingAttention)
						}
						help={
							summary.animalsNeedingAttention === null
								? unavailableHelp
								: "Último estado Regular, Malo o Enfermo."
						}
					/>
				</div>
			</section>
		</div>
	);
}
