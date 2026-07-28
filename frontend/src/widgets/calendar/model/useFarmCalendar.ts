import { addMonths, format, subMonths } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { analyticsService } from "@/features/reporting/api/analytics.service";
import { devLogger } from "@/shared/utils/devLogger";
import type { CalendarEvent } from "./calendar.types";

export const dayKey = (d: Date): string => format(d, "yyyy-MM-dd");

export const eventDayKey = (e: CalendarEvent): string => e.start.split("T")[0];

/** Filtra un mapa día→eventos por tipo ("all" devuelve el mapa original). */
export function filterEventsByDay(
	eventsByDay: Map<string, CalendarEvent[]>,
	typeFilter: string,
): Map<string, CalendarEvent[]> {
	if (typeFilter === "all") return eventsByDay;
	return new Map(
		[...eventsByDay].map(([k, v]) => [
			k,
			v.filter((e) => e.type === typeFilter),
		]),
	);
}

interface UseFarmCalendarResult {
	events: CalendarEvent[];
	loading: boolean;
	error: string | null;
	reload: () => void;
	/** Eventos agrupados por día (yyyy-MM-dd) para acceso O(1) desde la grilla. */
	eventsByDay: Map<string, CalendarEvent[]>;
	/** Conteo por tipo para los chips de resumen. */
	countByType: Map<string, number>;
}

/**
 * Carga los eventos del calendario global de la finca para el mes visible
 * (con un mes de margen a cada lado para navegación fluida).
 */
export function useFarmCalendar(month: Date): UseFarmCalendarResult {
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const startDate = format(subMonths(month, 1), "yyyy-MM-dd");
			const endDate = format(addMonths(month, 1), "yyyy-MM-dd");
			const response = await analyticsService.getGlobalCalendar(
				startDate,
				endDate,
			);
			const list = (response?.events ?? []) as CalendarEvent[];
			list.sort((a, b) => eventDayKey(a).localeCompare(eventDayKey(b)));
			setEvents(list);
		} catch (err) {
			devLogger.error("Error cargando calendario de la finca:", err);
			setError("No se pudo cargar el calendario");
			setEvents([]);
		} finally {
			setLoading(false);
		}
	}, [month]);

	useEffect(() => {
		load();
	}, [load]);

	const eventsByDay = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>();
		for (const e of events) {
			const key = eventDayKey(e);
			const bucket = map.get(key);
			if (bucket) bucket.push(e);
			else map.set(key, [e]);
		}
		return map;
	}, [events]);

	const countByType = useMemo(() => {
		const map = new Map<string, number>();
		for (const e of events) {
			map.set(e.type, (map.get(e.type) ?? 0) + 1);
		}
		return map;
	}, [events]);

	return { events, loading, error, reload: load, eventsByDay, countByType };
}
