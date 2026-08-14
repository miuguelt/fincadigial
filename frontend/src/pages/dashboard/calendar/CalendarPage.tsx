import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import { EmptyStateSimple } from "@/shared/ui/common";
import { getRolePrefix } from "@/shared/utils/roleRoutes";
import {
	AgendaView,
	CalendarMonthGrid,
	CalendarSummary,
	CalendarToolbar,
	type CalendarViewMode,
	dayKey,
	DayEventsPanel,
	filterEventsByDay,
	useFarmCalendar,
} from "@/widgets/calendar";

/**
 * Calendario de la Finca — agenda ganadera completa:
 * partos esperados, vacunas próximas, retiros, controles, tareas y alertas.
 * Mobile-first: agenda cronológica en pantallas pequeñas, grilla + panel en escritorio.
 */
export default function CalendarPage() {
	const { user } = useAuth() as any;
	const navigate = useNavigate();
	const [month, setMonth] = useState<Date>(new Date());
	const [selected, setSelected] = useState<Date>(new Date());
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [view, setView] = useState<CalendarViewMode>("mes");

	const {
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
	} = useFarmCalendar(month, selected);

	const filteredEvents = useMemo(
		() =>
			typeFilter === "all"
				? events
				: events.filter((e) => e.type === typeFilter),
		[events, typeFilter],
	);

	const filteredByDay = useMemo(
		() => filterEventsByDay(eventsByDay, typeFilter),
		[eventsByDay, typeFilter],
	);

	const selectedDayEvents = filteredByDay.get(dayKey(selected)) ?? [];
	const selectedKey = dayKey(selected);
	const selectedSummaryAlertCount =
		events.find(
			(event) =>
				event.type === "alert" &&
				event.is_summary &&
				event.start.split("T")[0] === selectedKey,
		)?.count ?? 0;
	const selectedDayTotal =
		typeFilter === "all"
			? (countsByDay.get(selectedKey) ?? selectedDayEvents.length)
			: typeFilter === "alert"
				? selectedDayAlertTotal || selectedSummaryAlertCount
				: selectedDayEvents.length;
	const filteredEventCount =
		typeFilter === "all"
			? totalCount
			: (countByType.get(typeFilter) ?? filteredEvents.length);

	const goToday = () => {
		const today = new Date();
		setMonth(today);
		setSelected(today);
	};

	const openAnimal = (animalId: number) => {
		navigate(`${getRolePrefix(user?.role)}/animals/${animalId}`);
	};

	return (
		<div className="w-full max-w-7xl mx-auto px-2 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-4">
			<CalendarToolbar
				month={month}
				selected={selected}
				eventCount={filteredEventCount}
				loading={loading}
				view={view}
				onViewChange={setView}
				onToday={goToday}
				onReload={reload}
			/>

			<CalendarSummary
				countByType={countByType}
				selected={typeFilter}
				onSelect={setTypeFilter}
			/>

			{(isOffline || (error && events.length > 0)) && (
				<div
					className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
					role="status"
				>
					📡 Mostrando la última información guardada. Se actualizará
					automáticamente cuando regrese la señal.
				</div>
			)}

			{error && events.length === 0 ? (
				<EmptyStateSimple
					icon="📡"
					title="No se pudo cargar el calendario"
					description="Revise su conexión e intente de nuevo"
					actionLabel="Reintentar"
					onAction={reload}
				/>
			) : loading && events.length === 0 ? (
				<div className="flex items-center justify-center py-20">
					<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
				</div>
			) : events.length === 0 ? (
				<EmptyStateSimple
					icon="📅"
					title="Todavía no hay eventos en este periodo"
					description="Los partos esperados, vacunas próximas, retiros, controles y tareas aparecerán aquí automáticamente."
				/>
			) : view === "agenda" ? (
				<div className="pb-6">
					{filteredEvents.length === 0 ? (
						<EmptyStateSimple
							icon="🔍"
							title="No hay eventos de este tipo"
							description="Pruebe con otro filtro o cambie de mes."
						/>
					) : (
						<AgendaView events={filteredEvents} onOpenAnimal={openAnimal} />
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 sm:gap-4 items-start pb-6">
					<div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-1.5 sm:p-4 shadow-sm">
						<CalendarMonthGrid
							month={month}
							selected={selected}
							onSelect={setSelected}
							onMonthChange={setMonth}
							eventsByDay={filteredByDay}
							totalsByDay={typeFilter === "all" ? countsByDay : undefined}
						/>
					</div>
					<div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-2 sm:p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] flex flex-col min-h-[200px] sm:min-h-[280px]">
						<DayEventsPanel
							day={selected}
							events={selectedDayEvents}
							totalEvents={selectedDayTotal}
							loading={dayLoading}
							error={dayError}
							onOpenAnimal={openAnimal}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
