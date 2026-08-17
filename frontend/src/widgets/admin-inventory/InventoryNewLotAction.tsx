import { PackagePlus } from "lucide-react";
import type {
	InventoryLotInput,
	InventoryLotResponse,
} from "@/shared/api/generated/swaggerTypes";
import { Button } from "@/shared/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";
import {
	buildReplenishPrefill,
	getInventoryAttentionReason,
} from "./inventoryReplenish";

type OpenCreate = (prefill?: Partial<InventoryLotInput>) => void;

/** Acción de fila: crear un lote nuevo clonando los datos del insumo (medicamento/vacuna, proveedor, unidad). */
export function InventoryNewLotAction({
	lot,
	openCreate,
}: {
	lot: InventoryLotResponse;
	openCreate?: OpenCreate;
}) {
	if (!openCreate) return null;

	const attentionReason = getInventoryAttentionReason(lot);
	const urgent = attentionReason !== null;
	const urgentMessage =
		attentionReason === "expired"
			? "Este lote está vencido — registrar un lote nuevo para reemplazarlo"
			: attentionReason === "out_of_stock"
				? "Este lote está agotado — registrar un lote nuevo para reponerlo"
				: "Este lote está por debajo del mínimo — registrar un lote nuevo";

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className={
							urgent
								? "h-9 px-2.5 rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-900 dark:text-amber-200 hover:bg-amber-500 hover:text-slate-950 hover:shadow-[0_0_12px_rgba(245,158,11,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-xs gap-1.5"
								: "h-9 px-2.5 rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-600 hover:text-white hover:border-sky-600 hover:shadow-[0_0_12px_rgba(56,189,248,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-xs gap-1.5"
						}
						onClick={(e) => {
							e.stopPropagation();
							openCreate(buildReplenishPrefill(lot));
						}}
						aria-label={`Registrar lote nuevo para ${lot.product_name || lot.lot_number}`}
					>
						<PackagePlus className="h-4 w-4 shrink-0" />
						<span className="hidden xl:inline">Nuevo Lote</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p className="text-xs font-medium">
						{urgent
							? `⚠️ ${urgentMessage}`
							: "📦 Registrar nuevo lote físico con fecha de vencimiento diferente"}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

/** Botón equivalente para el pie del modal de detalle. */
export function InventoryNewLotDetailButton({
	lot,
	openCreate,
	close,
}: {
	lot: InventoryLotResponse;
	openCreate?: OpenCreate;
	close?: () => void;
}) {
	if (!openCreate) return null;

	return (
		<Button
			size="sm"
			type="button"
			onClick={() => {
				close?.();
				// El modal de detalle debe desmontarse antes de abrir el de creación.
				setTimeout(() => openCreate(buildReplenishPrefill(lot)), 100);
			}}
			className="flex-1 sm:flex-initial h-10 px-4 bg-sky-600 font-bold text-white shadow-md transition-all duration-300 hover:bg-sky-700 hover:shadow-lg hover:-translate-y-0.5 gap-2 rounded-xl"
		>
			<PackagePlus className="h-4 w-4" />
			<span>Crear Nuevo Lote</span>
		</Button>
	);
}
