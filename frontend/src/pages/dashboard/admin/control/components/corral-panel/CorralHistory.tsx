import type { CorralHistoryItem } from "./types";

interface CorralHistoryProps {
	history: CorralHistoryItem[];
	loading: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
	dateStyle: "medium",
	timeStyle: "short",
});

function formatDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Fecha no disponible"
		: dateFormatter.format(date);
}

function healthClasses(status: CorralHistoryItem["health_status"]): string {
	if (status === "Malo")
		return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200";
	if (status === "Regular")
		return "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-200";
	return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200";
}

function reproductionLabel(value: string): string {
	if (value === "Inseminacion") return "Inseminación";
	if (value === "Diagnostico") return "Diagnóstico";
	return value;
}

export function CorralHistory({ history, loading }: CorralHistoryProps) {
	if (history.length === 0) return null;

	return (
		<section className="mt-8" aria-labelledby="corral-history-heading">
			<div className="mb-4 flex flex-wrap items-center gap-2">
				<h3
					id="corral-history-heading"
					className="text-xl font-bold text-foreground"
				>
					📋 Últimos registros del corral
				</h3>
				{loading && (
					<span
						className="animate-pulse text-sm font-normal text-muted-foreground"
						aria-live="polite"
					>
						Actualizando…
					</span>
				)}
			</div>
			<p className="mb-4 text-sm text-muted-foreground">
				Aquí aparecen los registros más recientes, aunque sean de otros días.
			</p>
			<ul className="space-y-3">
				{history.map((item) => (
					<li
						key={item.id}
						className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
					>
						<div className="flex items-center gap-3">
							<span
								aria-hidden="true"
								className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg dark:bg-emerald-950/60"
							>
								🐄
							</span>
							<div>
								<p className="text-lg font-bold text-foreground">
									{item.animal_name}
								</p>
								<time
									dateTime={item.created_at}
									className="text-sm text-muted-foreground"
								>
									{formatDate(item.created_at)}
								</time>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							{item.weight != null && (
								<span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
									⚖️ {item.weight} kg
								</span>
							)}
							{item.milk_liters != null && (
								<span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200">
									🥛 {item.milk_liters} L
								</span>
							)}
							{item.health_status && (
								<span
									className={`rounded-full border px-3 py-1 text-sm font-semibold ${healthClasses(item.health_status)}`}
								>
									🩺 {item.health_status}
								</span>
							)}
							{item.reproduction_event && (
								<span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-800 dark:border-purple-900 dark:bg-purple-950/50 dark:text-purple-200">
									💕 {reproductionLabel(item.reproduction_event)}
								</span>
							)}
							{item.treatment && (
								<span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-200">
									💊 Remedio aplicado
								</span>
							)}
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}
