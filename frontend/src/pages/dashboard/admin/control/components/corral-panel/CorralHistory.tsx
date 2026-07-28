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
	if (status === "Malo") return "border-red-200 bg-red-50 text-red-800";
	if (status === "Regular")
		return "border-yellow-200 bg-yellow-50 text-yellow-800";
	return "border-emerald-200 bg-emerald-50 text-emerald-800";
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
					className="text-xl font-bold text-gray-900"
				>
					📋 Últimos registros del corral
				</h3>
				{loading && (
					<span
						className="animate-pulse text-sm font-normal text-gray-500"
						aria-live="polite"
					>
						Actualizando…
					</span>
				)}
			</div>
			<p className="mb-4 text-sm text-gray-600">
				Aquí aparecen los registros más recientes, aunque sean de otros días.
			</p>
			<ul className="space-y-3">
				{history.map((item) => (
					<li
						key={item.id}
						className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
					>
						<div className="flex items-center gap-3">
							<span
								aria-hidden="true"
								className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg"
							>
								🐄
							</span>
							<div>
								<p className="text-lg font-bold text-gray-900">
									{item.animal_name}
								</p>
								<time
									dateTime={item.created_at}
									className="text-sm text-gray-600"
								>
									{formatDate(item.created_at)}
								</time>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							{item.weight != null && (
								<span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
									⚖️ {item.weight} kg
								</span>
							)}
							{item.milk_liters != null && (
								<span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800">
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
								<span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-800">
									💕 {reproductionLabel(item.reproduction_event)}
								</span>
							)}
							{item.treatment && (
								<span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-800">
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
