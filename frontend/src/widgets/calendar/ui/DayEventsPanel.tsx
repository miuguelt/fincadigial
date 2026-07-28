import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { CalendarEvent } from "../model/calendar.types";
import { EventCard } from "./EventCard";

interface DayEventsPanelProps {
	day: Date;
	events: CalendarEvent[];
	onOpenAnimal?: (animalId: number) => void;
}

/** Lista de eventos del día seleccionado con estado vacío es-CO. */
export function DayEventsPanel({
	day,
	events,
	onOpenAnimal,
}: DayEventsPanelProps) {
	return (
		<section aria-label="Eventos del día" className="flex flex-col min-h-0">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-bold text-foreground capitalize">
					{isToday(day)
						? "Hoy"
						: format(day, "EEEE d 'de' MMMM", { locale: es })}
				</h4>
				{events.length > 0 && (
					<span className="text-xs font-medium text-muted-foreground">
						{events.length} evento{events.length !== 1 ? "s" : ""}
					</span>
				)}
			</div>
			{events.length === 0 ? (
				<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 py-10">
					<CalendarDays className="h-9 w-9 opacity-30" />
					<p className="text-sm font-medium">Sin eventos este día</p>
					<p className="text-xs text-center max-w-[220px]">
						Toque otro día con puntos de color para ver su agenda
					</p>
				</div>
			) : (
				<div className="flex-1 space-y-2 overflow-y-auto pr-1">
					{events.map((event) => (
						<EventCard
							key={event.id}
							event={event}
							onOpenAnimal={onOpenAnimal}
						/>
					))}
				</div>
			)}
		</section>
	);
}
