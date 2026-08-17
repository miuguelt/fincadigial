import { AlertTriangle, PackagePlus, X } from "lucide-react";
import type {
	InventoryLotInput,
	InventoryLotResponse,
} from "@/shared/api/generated/swaggerTypes";
import { Button } from "@/shared/ui/button";
import {
	buildReplenishPrefill,
	countInventoryAttention,
} from "./inventoryReplenish";

/**
 * Barra que aparece al seleccionar lotes en la tabla. La reposición se hace
 * lote a lote (cada lote físico tiene su propio número y cantidad), así que
 * con selección múltiple se pide reducir a uno.
 */
export function InventoryReplenishBar({
	selectedIds,
	items,
	clearSelection,
	openCreate,
}: {
	selectedIds: number[];
	items: InventoryLotResponse[];
	clearSelection: () => void;
	openCreate?: (prefill?: Partial<InventoryLotInput>) => void;
}) {
	const selected = items.filter((item) => selectedIds.includes(item.id));
	if (!selected.length) return null;

	const single = selected.length === 1 ? selected[0] : null;
	const attention = countInventoryAttention(selected);
	const badges = [
		{
			count: attention.expired,
			label: attention.expired === 1 ? "vencido" : "vencidos",
			className: "bg-rose-400 text-slate-950",
		},
		{
			count: attention.out_of_stock,
			label: attention.out_of_stock === 1 ? "agotado" : "agotados",
			className: "bg-red-500 text-white",
		},
		{
			count: attention.low_stock,
			label: attention.low_stock === 1 ? "por acabarse" : "por acabarse",
			className: "bg-amber-400 text-slate-950",
		},
	].filter((badge) => badge.count > 0);

	return (
		<div className="sticky bottom-2 z-30 mx-auto mt-3 flex w-fit max-w-full flex-wrap items-center gap-3 rounded-full border border-border bg-slate-900 px-4 py-2 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
			<span className="text-xs font-bold">
				{selected.length} lote{selected.length > 1 ? "s" : ""} seleccionado
				{selected.length > 1 ? "s" : ""}
			</span>

			{badges.map((badge) => (
				<span
					key={badge.label}
					className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${badge.className}`}
				>
					<AlertTriangle className="h-3 w-3" />
					{badge.count} {badge.label}
				</span>
			))}

			{single ? (
				<Button
					size="sm"
					type="button"
					disabled={!openCreate}
					onClick={() => openCreate?.(buildReplenishPrefill(single))}
					className="h-8 rounded-full bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700"
				>
					<PackagePlus className="mr-1.5 h-3.5 w-3.5" />
					Nuevo lote de {single.lot_number}
				</Button>
			) : (
				<span className="text-[11px] font-medium opacity-80">
					Deja un solo lote seleccionado para registrar su reposición
				</span>
			)}

			<button
				type="button"
				onClick={clearSelection}
				aria-label="Limpiar selección"
				className="rounded-full p-1 hover:bg-white/20 dark:hover:bg-black/10"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
