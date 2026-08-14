import { endOfWeek, format, startOfWeek } from "date-fns";
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
	dayError: string | null;
	dayLoading: boolean;
	isOffline: boolean;
	totalCount: number;
	countsByDay: Map<string, number>;
	selectedDayAlertTotal: number;
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
export function useFarmCalendar(
	month: Date,
	selected: Date,
): UseFarmCalendarResult {
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [selectedAlertEvents, setSelectedAlertEvents] = useState<
		CalendarEvent[] | null
	>(null);
	const [selectedAlertDay, setSelectedAlertDay] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [dayLoading, setDayLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dayError, setDayError] = useState<string | null>(null);
	const [totalCount, setTotalCount] = useState(0);
	const [rawCountsByType, setRawCountsByType] = useState<Record<string, number>>(
		{},
	);
	const [rawCountsByDay, setRawCountsByDay] = useState<Record<string, number>>(
		{},
	);
	const [selectedDayAlertTotal, setSelectedDayAlertTotal] = useState(0);
	const [refreshKey, setRefreshKey] = useState(0);
	const [isOffline, setIsOffline] = useState(
		typeof navigator !== "undefined" && navigator.onLine === false,
	);

	useEffect(() => {
		const updateConnection = () => setIsOffline(navigator.onLine === false);
		window.addEventListener("online", updateConnection);
		window.addEventListener("offline", updateConnection);
		return () => {
			window.removeEventListener("online", updateConnection);
			window.removeEventListener("offline", updateConnection);
		};
	}, []);

	useEffect(() => {
		let active = true;
		const loadMonth = async () => {
			setLoading(true);
			setError(null);
			try {
				// Sólo las semanas visibles: ahorra datos y conserva los días adyacentes
				// que aparecen en la grilla mensual.
				const startDate = format(
					startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1), {
						weekStartsOn: 1,
					}),
					"yyyy-MM-dd",
				);
				const endDate = format(
					endOfWeek(new Date(month.getFullYear(), month.getMonth() + 1, 0), {
						weekStartsOn: 1,
					}),
					"yyyy-MM-dd",
				);
				const response = await analyticsService.getGlobalCalendar(startDate, endDate);
				if (!active) return;
				const list = [...(response.events ?? [])];
				list.sort((a, b) => eventDayKey(a).localeCompare(eventDayKey(b)));
				setEvents(list);
				setTotalCount(response.total_count ?? list.length);
				setRawCountsByType(response.counts_by_type ?? {});
				setRawCountsByDay(response.counts_by_day ?? {});
			} catch (err) {
				if (!active) return;
				devLogger.error("Error cargando calendario de la finca:", err);
				setError("No se pudo actualizar el calendario");
			} finally {
				if (active) setLoading(false);
			}
		};
		void loadMonth();
		return () => {
			active = false;
		};
	}, [month, refreshKey]);

	useEffect(() => {
		let active = true;
		const loadSelectedDay = async () => {
			setDayLoading(true);
			setDayError(null);
			setSelectedAlertEvents(null);
			setSelectedAlertDay(null);
			setSelectedDayAlertTotal(0);
			const selectedKey = dayKey(selected);
			try {
				const response = await analyticsService.getGlobalCalendar(
					selectedKey,
					selectedKey,
					{ alertMode: "details", alertLimit: 50, onlyAlerts: true },
				);
				if (!active) return;
				setSelectedAlertEvents(response.events ?? []);
				setSelectedAlertDay(selectedKey);
				setSelectedDayAlertTotal(response.alerts?.total ?? 0);
			} catch (err) {
				if (!active) return;
				devLogger.error("Error cargando alertas del día:", err);
				setDayError("No se pudieron actualizar las alertas de este día");
				setSelectedDayAlertTotal(0);
			} finally {
				if (active) setDayLoading(false);
			}
		};
		void loadSelectedDay();
		return () => {
			active = false;
		};
	}, [selected, refreshKey]);

	const reload = useCallback(() => setRefreshKey((value) => value + 1), []);

	const eventsByDay = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>();
		for (const e of events) {
			const key = eventDayKey(e);
			if (
				key === dayKey(selected) &&
				e.type === "alert" &&
				e.is_summary &&
				selectedAlertEvents !== null &&
				selectedAlertDay === dayKey(selected)
			) {
				continue;
			}
			const bucket = map.get(key);
			if (bucket) bucket.push(e);
			else map.set(key, [e]);
		}
		if (
			selectedAlertEvents !== null &&
			selectedAlertDay === dayKey(selected)
		) {
			const key = dayKey(selected);
			const bucket = map.get(key) ?? [];
			map.set(key, [...bucket, ...selectedAlertEvents]);
		}
		return map;
	}, [events, selected, selectedAlertDay, selectedAlertEvents]);

	const countByType = useMemo(() => {
		if (Object.keys(rawCountsByType).length > 0) {
			return new Map(
				Object.entries(rawCountsByType).map(([key, value]) => [key, Number(value)]),
			);
		}
		const fallback = new Map<string, number>();
		for (const event of events) {
			fallback.set(event.type, (fallback.get(event.type) ?? 0) + (event.count ?? 1));
		}
		return fallback;
	}, [events, rawCountsByType]);

	const countsByDay = useMemo(
		() =>
			new Map(
				Object.entries(rawCountsByDay).map(([key, value]) => [key, Number(value)]),
			),
		[rawCountsByDay],
	);

	return {
		events,
		loading,
		error,
		dayError,
		dayLoading,
		isOffline,
		totalCount,
		countsByDay,
		selectedDayAlertTotal,
		reload,
		eventsByDay,
		countByType,
	};
}
