import { CalendarDays, Wifi, WifiOff } from "lucide-react";
import { formatControlPageDate } from "../controlPage.utils";

interface ControlPageHeaderProps {
	today: string;
	isOnline: boolean;
}

export function ControlPageHeader({ today, isOnline }: ControlPageHeaderProps) {
	return (
		<header className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<p className="mb-1 text-sm font-semibold text-primary">
						Labores del ganado
					</p>
					<h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
						Trabajo de hoy
					</h1>
					<p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground sm:text-base">
						<CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
						<span>{formatControlPageDate(today)}</span>
					</p>
				</div>

				<div
					className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${
						isOnline
							? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
							: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
					}`}
					aria-live="polite"
				>
					{isOnline ? (
						<Wifi className="h-4 w-4" aria-hidden="true" />
					) : (
						<WifiOff className="h-4 w-4" aria-hidden="true" />
					)}
					{isOnline ? "Con conexión" : "Sin conexión"}
				</div>
			</div>
		</header>
	);
}
