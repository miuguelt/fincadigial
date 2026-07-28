import {
	ChevronRight,
	ClipboardList,
	Heart,
	MapPin,
	Milk,
	Scale,
} from "lucide-react";
import { cn } from "@/shared/ui/cn";
import type { ControlModalKey } from "../controlPage.types";

interface DailyActionGridProps {
	canRecord: boolean;
	canTransfer: boolean;
	onAction: (action: ControlModalKey) => void;
}

const ACTIONS = [
	{
		id: "milk",
		title: "Registrar ordeño",
		description: "Anote los litros de una vaca.",
		icon: Milk,
		accent: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30",
		permission: "record",
	},
	{
		id: "weight",
		title: "Registrar peso",
		description: "Guarde cuánto pesa un animal.",
		icon: Scale,
		accent: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30",
		permission: "record",
	},
	{
		id: "health",
		title: "Reportar animal enfermo",
		description: "Cuente si está decaído o enfermo.",
		icon: Heart,
		accent: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/30",
		permission: "record",
	},
	{
		id: "transfer",
		title: "Mover de potrero",
		description: "Cambie el potrero del animal.",
		icon: MapPin,
		accent:
			"text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30",
		permission: "transfer",
	},
] as const;

export function DailyActionGrid({
	canRecord,
	canTransfer,
	onAction,
}: DailyActionGridProps) {
	const visibleActions = ACTIONS.filter((action) =>
		action.permission === "transfer" ? canTransfer : canRecord,
	);

	return (
		<section aria-labelledby="daily-actions-title" className="space-y-3">
			<div>
				<h2
					id="daily-actions-title"
					className="text-lg font-bold text-foreground"
				>
					¿Qué quiere registrar?
				</h2>
				<p className="text-sm text-muted-foreground">
					Elija una labor y le mostramos solamente lo necesario.
				</p>
			</div>

			{visibleActions.length ? (
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{visibleActions.map((action) => (
						<button
							key={action.id}
							type="button"
							onClick={() => onAction(action.id)}
							className="group min-w-0 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-4"
							aria-label={`${action.title}. ${action.description}`}
						>
							<div className="flex items-start justify-between gap-2">
								<span
									className={cn(
										"inline-flex rounded-xl border p-2",
										action.accent,
									)}
								>
									<action.icon className="h-5 w-5" aria-hidden="true" />
								</span>
								<ChevronRight
									className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
									aria-hidden="true"
								/>
							</div>
							<h3 className="mt-3 text-sm font-bold leading-tight text-foreground sm:text-base">
								{action.title}
							</h3>
							<p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
								{action.description}
							</p>
						</button>
					))}
				</div>
			) : (
				<p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
					Su acceso permite consultar los registros, pero no crear nuevos.
				</p>
			)}

			{canRecord && (
				<button
					type="button"
					onClick={() => onAction("corral")}
					className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left text-emerald-950 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
				>
					<span className="rounded-xl bg-emerald-600 p-2 text-white">
						<ClipboardList className="h-5 w-5" aria-hidden="true" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block font-bold">
							Registrar varios datos de un animal
						</span>
						<span className="block text-sm text-emerald-800 dark:text-emerald-300">
							Use el registro completo para guardar peso, salud, ordeño o
							potrero.
						</span>
					</span>
					<ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
				</button>
			)}
		</section>
	);
}
