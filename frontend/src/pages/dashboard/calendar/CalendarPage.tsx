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

	const { events, loading, error, reload, eventsByDay, countByType } =
		useFarmCalendar(month);

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
				eventCount={filteredEvents.length}
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

			{error ? (
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
						/>
					</div>
					<div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card p-2 sm:p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)] flex flex-col min-h-[200px] sm:min-h-[280px]">
						<DayEventsPanel
							day={selected}
							events={selectedDayEvents}
							onOpenAnimal={openAnimal}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
