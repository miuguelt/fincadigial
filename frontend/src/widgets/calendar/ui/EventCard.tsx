import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { type CalendarEvent, getTypeConfig } from "../model/calendar.types";

interface EventCardProps {
	event: CalendarEvent;
	onOpenAnimal?: (animalId: number) => void;
	compact?: boolean;
}

/**
 * Tarjeta de evento del calendario — borde de color por tipo,
 * enlace directo al animal cuando aplica.
 */
export function EventCard({ event, onOpenAnimal, compact }: EventCardProps) {
	const cfg = getTypeConfig(event.type);
	const Icon = cfg.icon;

	return (
		<div
			className={cn(
				"flex items-start gap-3 rounded-xl bg-card border border-border/60 shadow-sm",
				compact ? "p-2.5" : "p-3",
			)}
			style={{ borderLeftWidth: "4px", borderLeftColor: event.color }}
		>
			<div className="mt-0.5 p-1.5 rounded-lg bg-muted/50 border border-border/40 shrink-0">
				<Icon className="w-4 h-4" style={{ color: event.color }} />
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-start justify-between gap-2">
					<p className="text-sm font-semibold text-foreground leading-snug break-words">
						{event.title}
					</p>
					{event.priority && (
						<span
							className={cn(
								"shrink-0 text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
								event.priority === "Crítica" || event.priority === "Urgente"
									? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
									: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
							)}
						>
							{event.priority}
						</span>
					)}
				</div>
				{event.description && !compact && (
					<p className="text-xs text-muted-foreground mt-0.5 break-words">
						{event.description}
					</p>
				)}
				<div className="flex items-center justify-between gap-2 mt-1.5">
					<span
						className="text-[11px] font-bold uppercase tracking-wider"
						style={{ color: event.color }}
					>
						{cfg.emoji} {cfg.label}
					</span>
					{event.animal_id && onOpenAnimal && (
						<button
							type="button"
							onClick={() => onOpenAnimal(event.animal_id as number)}
							className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline hover:gap-2 active:scale-95 transition-all duration-300 ease-in-out"
						>
							{event.animal_record
								? `Ver ${event.animal_record}`
								: "Ver animal"}
							<ArrowRight className="h-3 w-3 shrink-0" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
