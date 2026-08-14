import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { CalendarEvent } from "../model/calendar.types";
import { EventCard } from "./EventCard";

interface DayEventsPanelProps {
	day: Date;
	events: CalendarEvent[];
	totalEvents?: number;
	loading?: boolean;
	error?: string | null;
	onOpenAnimal?: (animalId: number) => void;
}

const MAX_RENDERED_DAY_EVENTS = 60;

/** Lista de eventos del día seleccionado con estado vacío es-CO. */
export function DayEventsPanel({
	day,
	events,
	totalEvents = events.length,
	loading = false,
	error,
	onOpenAnimal,
}: DayEventsPanelProps) {
	const visibleEvents = events.slice(0, MAX_RENDERED_DAY_EVENTS);
	const effectiveTotal = Math.max(totalEvents, events.length);

	return (
		<section aria-label="Eventos del día" className="flex flex-col min-h-0">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-bold text-foreground capitalize">
					{isToday(day)
						? "Hoy"
						: format(day, "EEEE d 'de' MMMM", { locale: es })}
				</h4>
				{effectiveTotal > 0 && (
					<span className="text-xs font-medium text-muted-foreground">
						{effectiveTotal} evento{effectiveTotal !== 1 ? "s" : ""}
					</span>
				)}
			</div>
			{loading && events.length === 0 ? (
				<div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
					<div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<p className="text-xs font-medium">Cargando lo prioritario del día</p>
				</div>
			) : events.length === 0 ? (
				<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 py-10">
					<CalendarDays className="h-9 w-9 opacity-30" />
					<p className="text-sm font-medium">Sin eventos este día</p>
					<p className="text-xs text-center max-w-[220px]">
						Toque otro día con puntos de color para ver su agenda
					</p>
				</div>
			) : (
				<div className="flex-1 space-y-2 overflow-y-auto pr-1">
					{visibleEvents.map((event) => (
						<EventCard
							key={event.id}
							event={event}
							onOpenAnimal={onOpenAnimal}
						/>
					))}
					{visibleEvents.length < effectiveTotal && (
						<p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
							Mostrando {visibleEvents.length} alertas prioritarias de {effectiveTotal}.
							Use el módulo Alertas para gestionarlas todas.
						</p>
					)}
					{loading && (
						<p className="text-center text-xs text-muted-foreground" role="status">
							Actualizando alertas del día…
						</p>
					)}
					{error && (
						<p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
							{error}. Se conserva el resumen guardado.
						</p>
					)}
				</div>
			)}
		</section>
	);
}
