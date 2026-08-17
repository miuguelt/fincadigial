import { X } from "lucide-react";
import type { InventoryLotStatus } from "@/entities/inventory/api/inventory.service";
import { cn } from "@/shared/ui/cn";
import type {
	InventoryFilters,
	InventoryProductType,
} from "./InventoryFilters";

interface ChipProps {
	label: string;
	count?: number;
	active: boolean;
	tone?: "neutral" | "danger" | "warning" | "success";
	onClick: () => void;
}

// Fondos sólidos en todos los estados: nunca texto claro sobre fondo claro.
const ACTIVE_TONE: Record<NonNullable<ChipProps["tone"]>, string> = {
	neutral: "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100",
	danger: "bg-red-600 text-white border-red-700",
	warning: "bg-amber-400 text-slate-950 border-amber-500",
	success: "bg-emerald-600 text-white border-emerald-700",
};

function Chip({ label, count, active, tone = "neutral", onClick }: ChipProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
				active
					? ACTIVE_TONE[tone]
					: "border-border bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
			)}
		>
			{label}
			{count !== undefined && (
				<span
					className={cn(
						"rounded-full px-1.5 py-0.5 text-[11px] font-black tabular-nums",
						active ? "bg-black/20 dark:bg-white/25" : "bg-black/10 dark:bg-white/15",
					)}
				>
					{count}
				</span>
			)}
		</button>
	);
}

export interface InventoryFilterChipsProps {
	filters: InventoryFilters;
	onChange: (next: InventoryFilters) => void;
	counts?: {
		expired: number;
		expiring_soon: number;
		low_stock: number;
		medication: number;
		vaccine: number;
		total: number;
	};
}

const STATUS_CHIPS: Array<{
	status: InventoryLotStatus;
	label: string;
	tone: ChipProps["tone"];
	countKey: "expired" | "expiring_soon" | "low_stock";
}> = [
	{ status: "expired", label: "Vencidos", tone: "danger", countKey: "expired" },
	{
		status: "expiring_soon",
		label: "Vencen pronto",
		tone: "warning",
		countKey: "expiring_soon",
	},
	{
		status: "low_stock",
		label: "Stock bajo",
		tone: "warning",
		countKey: "low_stock",
	},
];

const TYPE_CHIPS: Array<{ type: InventoryProductType; label: string }> = [
	{ type: "Medicamento", label: "Medicamentos" },
	{ type: "Vacuna", label: "Vacunas" },
];

export function InventoryFilterChips({
	filters,
	onChange,
	counts,
}: InventoryFilterChipsProps) {
	const hasFilters = Boolean(filters.status || filters.product_type);

	const toggle = <K extends keyof InventoryFilters>(
		key: K,
		value: InventoryFilters[K],
	) => {
		onChange({
			...filters,
			[key]: filters[key] === value ? undefined : value,
		});
	};

	return (
		<fieldset
			className="flex flex-wrap items-center gap-2 border-0 p-0"
			aria-label="Filtros de inventario"
		>
			<Chip
				label="Todos"
				count={counts?.total}
				active={!hasFilters}
				onClick={() => onChange({})}
			/>
			{STATUS_CHIPS.map((chip) => (
				<Chip
					key={chip.status}
					label={chip.label}
					tone={chip.tone}
					count={counts?.[chip.countKey]}
					active={filters.status === chip.status}
					onClick={() => toggle("status", chip.status)}
				/>
			))}
			<span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
			{TYPE_CHIPS.map((chip) => (
				<Chip
					key={chip.type}
					label={chip.label}
					count={
						chip.type === "Medicamento" ? counts?.medication : counts?.vaccine
					}
					active={filters.product_type === chip.type}
					onClick={() => toggle("product_type", chip.type)}
				/>
			))}
			{hasFilters && (
				<button
					type="button"
					onClick={() => onChange({})}
					className="inline-flex items-center gap-1 rounded-full border border-border bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
				>
					<X className="h-3 w-3" /> Limpiar
				</button>
			)}
		</fieldset>
	);
}
