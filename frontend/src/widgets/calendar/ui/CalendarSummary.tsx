import { CALENDAR_FILTER_OPTIONS } from "../model/calendar.types";

interface CalendarSummaryProps {
	countByType: Map<string, number>;
	selected: string;
	onSelect: (typeKey: string) => void;
}

/**
 * Chips de resumen del rango cargado — muestran cuántos eventos hay
 * por tipo y actúan como atajo de filtro al tocarlos.
 */
export function CalendarSummary({
	countByType,
	selected,
	onSelect,
}: CalendarSummaryProps) {
	const items = CALENDAR_FILTER_OPTIONS.filter(
		(o) => o.key !== "all" && (countByType.get(o.key) ?? 0) > 0,
	);

	return (
		<div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
			{/* Chip "Todo" */}
			<button
				type="button"
				onClick={() => onSelect("all")}
				className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap border transition-all active:scale-95 shrink-0 ${
					selected === "all"
						? "bg-primary text-primary-foreground border-primary shadow-sm"
						: "bg-card text-muted-foreground border-border hover:border-primary/40"
				}`}
				aria-pressed={selected === "all"}
			>
				<span className="text-sm sm:text-base leading-none">📅</span>
				<span className="font-bold">{countByType.size > 0 ? [...countByType.values()].reduce((a, b) => a + b, 0) : 0}</span>
				<span className="hidden sm:inline ml-0.5">Todo</span>
			</button>

			{items.length > 0 && (
				<>
					<div className="w-px bg-border/40 my-1 shrink-0" />
					{items.map((opt) => {
						const count = countByType.get(opt.key) ?? 0;
						const active = selected === opt.key;
						return (
							<button
								key={opt.key}
								type="button"
								onClick={() => onSelect(active ? "all" : opt.key)}
								className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap border transition-all active:scale-95 shrink-0 ${
									active
										? "bg-primary text-primary-foreground border-primary shadow-sm"
										: "bg-card text-muted-foreground border-border hover:border-primary/40"
								}`}
								aria-pressed={active}
							>
								<span className="text-sm sm:text-base leading-none">{opt.emoji}</span>
								<span className="font-bold">{count}</span>
								<span className="hidden sm:inline ml-0.5">{opt.label}</span>
							</button>
						);
					})}
				</>
			)}
		</div>
	);
}
