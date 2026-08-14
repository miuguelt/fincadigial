import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "../model/calendar.types";
import { eventDayKey } from "../model/useFarmCalendar";
import { EventCard } from "./EventCard";

interface AgendaViewProps {
	events: CalendarEvent[];
	onOpenAnimal?: (animalId: number) => void;
}

function dayLabel(key: string): string {
	const day = parseISO(key);
	if (isToday(day)) return "Hoy";
	if (isTomorrow(day)) return "Mañana";
	return format(day, "EEEE d 'de' MMMM", { locale: es });
}

/**
 * Vista agenda cronológica — ideal en pantallas pequeñas:
 * agrupa los eventos por día con encabezados "Hoy", "Mañana", fecha.
 */
export function AgendaView({ events, onOpenAnimal }: AgendaViewProps) {
	const [visibleCount, setVisibleCount] = useState(100);

	useEffect(() => {
		setVisibleCount(100);
	}, [events]);

	const visibleEvents = events.slice(0, visibleCount);
	const groups = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>();
		for (const e of visibleEvents) {
			const key = eventDayKey(e);
			const bucket = map.get(key);
			if (bucket) bucket.push(e);
			else map.set(key, [e]);
		}
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
	}, [visibleEvents]);

	if (groups.length === 0) return null;

	return (
		<div className="space-y-5">
			{groups.map(([key, dayEvents]) => {
				const representedCount = dayEvents.reduce(
					(total, event) => total + (event.count ?? 1),
					0,
				);
				return (
				<section key={key} aria-label={dayLabel(key)}>
					<div className="flex items-center gap-2 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1.5 z-10">
						<h4 className="text-sm font-bold text-foreground capitalize">
							{dayLabel(key)}
						</h4>
						<span className="text-[11px] font-semibold text-muted-foreground">
							{representedCount} evento{representedCount !== 1 ? "s" : ""}
						</span>
						<div className="flex-1 h-px bg-border/60" />
					</div>
					<div className="space-y-2">
						{dayEvents.map((event) => (
							<EventCard
								key={event.id}
								event={event}
								onOpenAnimal={onOpenAnimal}
							/>
						))}
					</div>
				</section>
				);
			})}
			{visibleCount < events.length && (
				<button
					type="button"
					onClick={() => setVisibleCount((count) => count + 100)}
					className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-primary hover:bg-primary/10"
				>
					Mostrar 100 eventos más
				</button>
			)}
		</div>
	);
}
