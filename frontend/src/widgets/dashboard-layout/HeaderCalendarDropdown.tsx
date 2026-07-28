import { addMonths, format, isSameDay, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
	AlertCircle,
	ArrowRight,
	CalendarDays,
	HeartPulse,
	Pill,
	Syringe,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/model/useAuth";
import { analyticsService } from "@/features/reporting/api/analytics.service";
import { Badge } from "@/shared/ui/badge";
import { CalendarMonthGrid } from "@/widgets/calendar/ui/CalendarMonthGrid";
import { cn } from "@/shared/ui/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { devLogger } from "@/shared/utils/devLogger";
import { getRolePrefix } from "@/shared/utils/roleRoutes";

import type { CalendarEvent } from "@/widgets/calendar/model/calendar.types";

const typeConfig: Record<string, { icon: typeof HeartPulse; label: string }> = {
	reproduction: { icon: HeartPulse, label: "Reproductivo" },
	future_birth: { icon: HeartPulse, label: "Parto" },
	health: { icon: Pill, label: "Tratamiento" },
	vaccination: { icon: Syringe, label: "Vacunación" },
	control: { icon: CalendarDays, label: "Control" },
	alert: { icon: AlertCircle, label: "Alerta" },
};

export default function HeaderCalendarDropdown() {
	const { user } = useAuth() as any;
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [month, setMonth] = useState(new Date());
	const [selected, setSelected] = useState<Date>(new Date());

	const loadEvents = async () => {
		try {
			const today = new Date();
			const start = format(subMonths(today, 1), "yyyy-MM-dd");
			const end = format(addMonths(today, 2), "yyyy-MM-dd");
			const response = await analyticsService.getGlobalCalendar(start, end);
			if (response?.events) setEvents(response.events);
		} catch (error) {
			devLogger.error("Error loading calendar events:", error);
		}
	};

	useEffect(() => {
		if (open) loadEvents();
	}, [open]);

	const eventsByDay = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>();
		for (const e of events) {
			const key = e.start.split("T")[0];
			const bucket = map.get(key);
			if (bucket) bucket.push(e);
			else map.set(key, [e]);
		}
		return map;
	}, [events]);

	const todayEvents = useMemo(
		() => events.filter((e) => isSameDay(new Date(e.start), new Date())),
		[events],
	);

	const selectedEvents = useMemo(
		() => events.filter((e) => isSameDay(new Date(e.start), selected)),
		[events, selected],
	);

	const goToFullCalendar = () => {
		setOpen(false);
		navigate(`${getRolePrefix(user?.role || "")}/calendar`);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					className={cn(
						"relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl",
						"border border-border/40 bg-surface hover:bg-primary/10 text-muted-foreground hover:text-primary",
						"transition-all duration-200 shadow-sm",
					)}
					title="Calendario"
					aria-label="Abrir calendario"
				>
					<CalendarDays className="h-4 w-4" />
					{todayEvents.length > 0 && (
						<span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center shadow-sm">
							{todayEvents.length > 9 ? "9+" : todayEvents.length}
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-[90vw] sm:w-[640px] max-w-[800px] p-0 z-[3200] rounded-2xl glass-dropdown border-border/40"
			>
				<div className="p-4 border-b border-border/30">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-bold text-foreground">Calendario</h3>
						<Badge variant="outline" className="text-[10px]">
							{events.length} eventos
						</Badge>
					</div>
				</div>

				<div className="flex flex-col sm:flex-row p-4 gap-6">
					<div className="flex-1 min-w-0 w-full">
						<CalendarMonthGrid
							month={month}
							selected={selected}
							onSelect={(d) => d && setSelected(d)}
							onMonthChange={setMonth}
							eventsByDay={eventsByDay}
						/>
					</div>

					<div className="w-full sm:w-[260px] flex flex-col max-h-[280px] sm:max-h-[320px] overflow-y-auto pr-1">
						<h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
							{isSameDay(selected, new Date())
								? "Hoy"
								: format(selected, "d 'de' MMMM", { locale: es })}
						</h4>
						{(isSameDay(selected, new Date()) ? todayEvents : selectedEvents)
							.length === 0 ? (
							<p className="text-xs text-muted-foreground py-2 text-center my-auto">
								Sin eventos este día
							</p>
						) : (
							<div className="space-y-2">
								{(isSameDay(selected, new Date()) ? todayEvents : selectedEvents)
									.slice(0, 5)
									.map((event) => {
										const cfg = typeConfig[event.type] || {
											icon: CalendarDays,
											label: "Evento",
										};
										const Icon = cfg.icon;
										return (
											<div
												key={event.id}
												className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
											>
												<div className="p-1.5 rounded-lg bg-background shadow-sm border border-border/40 flex-shrink-0">
													<Icon
														className="w-4 h-4"
														style={{ color: event.color }}
													/>
												</div>
												<div className="flex flex-col min-w-0">
													<span className="text-xs font-semibold text-foreground truncate">
														{event.title}
													</span>
													<span
														className="text-[9px] font-bold uppercase tracking-wider"
														style={{ color: event.color }}
													>
														{cfg.label}
													</span>
												</div>
											</div>
										);
									})}
							</div>
						)}
					</div>
				</div>

				<button
					onClick={goToFullCalendar}
					className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors rounded-b-2xl border-t border-border/30"
				>
					Ver calendario completo
					<ArrowRight className="h-3.5 w-3.5" />
				</button>
			</PopoverContent>
		</Popover>
	);
}
