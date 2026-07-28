import {
	addDays,
	addMonths,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
	subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/shared/ui/cn";
import {
	TYPE_DOT_PRIORITY,
	type CalendarEvent,
	type CalendarEventType,
} from "../model/calendar.types";
import { dayKey } from "../model/useFarmCalendar";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarMonthGridProps {
	month: Date;
	selected: Date;
	onSelect: (day: Date) => void;
	onMonthChange: (month: Date) => void;
	eventsByDay: Map<string, CalendarEvent[]>;
}

/** Colores de los puntos de un día: máximo 3, priorizando lo urgente. */
function dotColors(events: CalendarEvent[]): string[] {
	const present = new Set(events.map((e) => e.type));
	const ordered = TYPE_DOT_PRIORITY.filter((t) => present.has(t)).slice(0, 3);
	return ordered.map((t) => {
		const ev = events.find((e) => e.type === (t as CalendarEventType));
		return ev?.color ?? "#64748b";
	});
}

export function CalendarMonthGrid({
	month,
	selected,
	onSelect,
	onMonthChange,
	eventsByDay,
}: CalendarMonthGridProps) {
	const weeks = useMemo(() => {
		const start = startOfWeek(startOfMonth(month), { locale: es });
		const end = endOfWeek(endOfMonth(month), { locale: es });
		const days: Date[] = [];
		let cursor = start;
		while (cursor <= end) {
			days.push(cursor);
			cursor = addDays(cursor, 1);
		}
		const rows: Date[][] = [];
		for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
		return rows;
	}, [month]);

	return (
		<div className="w-full">
			{/* Navegación de mes — targets táctiles grandes */}
			<div className="flex items-center justify-between mb-1.5 sm:mb-2 px-0 sm:px-1">
				<button
					type="button"
					onClick={() => onMonthChange(subMonths(month, 1))}
					className="h-8 sm:h-10 w-8 sm:w-10 flex items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out active:scale-95"
					aria-label="Mes anterior"
				>
					<ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
				</button>
				<h3 className="text-sm sm:text-lg font-bold text-foreground capitalize truncate px-1">
					{format(month, "MMMM yyyy", { locale: es })}
				</h3>
				<button
					type="button"
					onClick={() => onMonthChange(addMonths(month, 1))}
					className="h-8 sm:h-10 w-8 sm:w-10 flex items-center justify-center rounded-lg border border-border/50 bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out active:scale-95"
					aria-label="Mes siguiente"
				>
					<ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
				</button>
			</div>

			{/* Encabezado de días de semana */}
			<div className="grid grid-cols-7 mb-0.5 sm:mb-1">
				{WEEKDAY_LABELS.map((label) => (
					<span
						key={label}
						className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground uppercase py-0.5 sm:py-1"
					>
						{label}
					</span>
				))}
			</div>

			{/* Semanas */}
			<div className="space-y-0.5 sm:space-y-1">
				{weeks.map((week) => (
					<div key={dayKey(week[0])} className="grid grid-cols-7 gap-0.5 sm:gap-1">
						{week.map((day) => {
							const key = dayKey(day);
							const dayEvents = eventsByDay.get(key) ?? [];
							const dots = dotColors(dayEvents);
							const inMonth = isSameMonth(day, month);
							const isSelected = isSameDay(day, selected);
							const today = isToday(day);

							return (
								<button
									key={key}
									type="button"
									onClick={() => onSelect(day)}
									className={cn(
										"relative flex flex-col items-center justify-start pt-1 sm:pt-1.5 pb-0.5 sm:pb-1 rounded-lg sm:rounded-xl min-h-[40px] sm:min-h-[64px] transition-all active:scale-95 border",
										inMonth
											? "bg-card border-transparent hover:border-primary/40"
											: "bg-transparent border-transparent opacity-40",
										isSelected &&
											"border-primary bg-primary/10 shadow-sm",
										today && !isSelected && "border-primary/50",
									)}
									aria-label={format(day, "d 'de' MMMM", { locale: es })}
									aria-pressed={isSelected}
								>
									<span
										className={cn(
											"text-[11px] sm:text-sm font-semibold leading-none",
											isSelected
												? "text-primary"
												: today
													? "text-primary font-bold"
													: "text-foreground",
										)}
									>
										{format(day, "d")}
									</span>
									{dots.length > 0 && (
										<span className="flex gap-0.5 mt-0.5 sm:mt-1">
											{dots.map((color) => (
												<span
													key={`${key}-dot-${color}`}
													className="h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full"
													style={{ backgroundColor: color }}
												/>
											))}
											{dayEvents.length > 3 && (
												<span className="text-[7px] sm:text-[8px] leading-none font-bold text-muted-foreground ml-0.5">
													+{dayEvents.length - 3}
												</span>
											)}
										</span>
									)}
								</button>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}
