import {
	AlertTriangle,
	Baby,
	ClipboardList,
	HeartPulse,
	Milk,
	Pill,
	Scale,
	Syringe,
} from "lucide-react";

export type CalendarEventType =
	| "reproduction"
	| "future_birth"
	| "health"
	| "vaccination"
	| "vaccine_due"
	| "withdrawal_end"
	| "control"
	| "task"
	| "alert";

export interface CalendarEvent {
	id: string;
	title: string;
	start: string; // YYYY-MM-DD
	type: CalendarEventType;
	color: string;
	animal_id?: number | null;
	animal_record?: string | null;
	priority?: string | null;
	description?: string;
	/** Cantidad real representada por una tarjeta resumida. */
	count?: number;
	/** Indica que el evento representa un grupo y no un registro individual. */
	is_summary?: boolean;
}

export interface CalendarResponse {
	events: CalendarEvent[];
	count: number;
	total_count: number;
	counts_by_type: Record<string, number>;
	counts_by_day: Record<string, number>;
	range?: { start: string; end: string };
	alerts?: {
		mode: "summary" | "details";
		total: number;
		loaded: number;
		truncated: boolean;
		limit: number;
	};
}

export interface EventTypeConfig {
	icon: typeof HeartPulse;
	label: string;
	emoji: string;
}

/** Config es-CO por tipo de evento — alineada con EVENT_COLORS del backend. */
export const EVENT_TYPE_CONFIG: Record<CalendarEventType, EventTypeConfig> = {
	future_birth: { icon: Baby, label: "Parto esperado", emoji: "🐄" },
	vaccine_due: { icon: Syringe, label: "Próxima dosis", emoji: "💉" },
	withdrawal_end: { icon: Milk, label: "Fin de retiro", emoji: "🥛" },
	alert: { icon: AlertTriangle, label: "Alerta", emoji: "⚠️" },
	task: { icon: ClipboardList, label: "Tarea", emoji: "📋" },
	control: { icon: Scale, label: "Control y pesaje", emoji: "⚖️" },
	vaccination: { icon: Syringe, label: "Vacuna aplicada", emoji: "💉" },
	health: { icon: Pill, label: "Tratamiento", emoji: "💊" },
	reproduction: { icon: HeartPulse, label: "Reproductivo", emoji: "❤️" },
};

export const getTypeConfig = (type: string): EventTypeConfig =>
	EVENT_TYPE_CONFIG[type as CalendarEventType] ?? {
		icon: ClipboardList,
		label: "Evento",
		emoji: "📌",
	};

/** Orden de prioridad visual para los puntos del día (lo más urgente primero). */
export const TYPE_DOT_PRIORITY: CalendarEventType[] = [
	"alert",
	"future_birth",
	"vaccine_due",
	"withdrawal_end",
	"task",
	"control",
	"vaccination",
	"health",
	"reproduction",
];

export interface FilterOption {
	key: string;
	label: string;
	emoji: string;
}

export const CALENDAR_FILTER_OPTIONS: FilterOption[] = [
	{ key: "all", label: "Todo", emoji: "📅" },
	{ key: "future_birth", label: "Partos", emoji: "🐄" },
	{ key: "vaccine_due", label: "Vacunas próximas", emoji: "💉" },
	{ key: "withdrawal_end", label: "Retiros", emoji: "🥛" },
	{ key: "alert", label: "Alertas", emoji: "⚠️" },
	{ key: "task", label: "Tareas", emoji: "📋" },
	{ key: "control", label: "Controles", emoji: "⚖️" },
	{ key: "vaccination", label: "Vacunas aplicadas", emoji: "✅" },
	{ key: "health", label: "Tratamientos", emoji: "💊" },
	{ key: "reproduction", label: "Reproductivo", emoji: "❤️" },
];
