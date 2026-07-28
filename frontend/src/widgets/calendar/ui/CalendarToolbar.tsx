import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, LayoutGrid, List, RefreshCw } from "lucide-react";
import { cn } from "@/shared/ui/cn";

export type CalendarViewMode = "mes" | "agenda";

interface CalendarToolbarProps {
	month: Date;
	selected: Date;
	eventCount: number;
	loading: boolean;
	view: CalendarViewMode;
	onViewChange: (view: CalendarViewMode) => void;
	onToday: () => void;
	onReload: () => void;
}

/** Encabezado del calendario: título, conteo, acciones y toggle de vista. */
export function CalendarToolbar({
	month,
	selected,
	eventCount,
	loading,
	view,
	onViewChange,
	onToday,
	onReload,
}: CalendarToolbarProps) {
	return (
		<header className="flex flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-3">
			<div className="flex items-center gap-2 sm:gap-3 min-w-0">
				<div className="p-1.5 sm:p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
					<CalendarDays className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
				</div>
				<div className="min-w-0">
					<h1 className="text-sm sm:text-2xl font-black text-foreground leading-tight truncate">
						Calendario de la Finca
					</h1>
					<p className="text-[11px] sm:text-sm text-muted-foreground capitalize">
						{format(month, "MMMM yyyy", { locale: es })} · {eventCount}{" "}
						evento{eventCount !== 1 ? "s" : ""}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
				{!isToday(selected) && (
					<button
						type="button"
						onClick={onToday}
						className="h-8 sm:h-9 px-2.5 sm:px-4 rounded-lg text-[11px] sm:text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out active:scale-95"
					>
						Hoy
					</button>
				)}
				<button
					type="button"
					onClick={onReload}
					disabled={loading}
					className="h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground hover:text-primary hover:bg-primary/10 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50"
					aria-label="Actualizar calendario"
				>
					<RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", loading && "animate-spin")} />
				</button>
				<div className="flex rounded-lg border border-border/50 bg-card overflow-hidden shadow-sm">
					{(["mes", "agenda"] as CalendarViewMode[]).map((mode) => {
						const Icon = mode === "mes" ? LayoutGrid : List;
						return (
							<button
								key={mode}
								type="button"
								onClick={() => onViewChange(mode)}
								className={cn(
									"h-8 sm:h-9 px-2.5 sm:px-4 flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-bold transition-all duration-300 ease-in-out",
									view === mode
										? "bg-primary text-primary-foreground shadow-sm"
										: "text-muted-foreground hover:bg-muted/50",
								)}
								aria-pressed={view === mode}
							>
								<Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
								<span className="hidden sm:inline capitalize">
									{mode === "mes" ? "Mes" : "Agenda"}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</header>
	);
}
