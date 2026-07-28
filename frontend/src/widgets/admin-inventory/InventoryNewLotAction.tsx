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
import { buildReplenishPrefill, needsReplenish } from "./inventoryReplenish";

type OpenCreate = (prefill?: Partial<InventoryLotInput>) => void;

/** Acción de fila: crear un lote nuevo heredando los datos del que se acaba. */
export function InventoryNewLotAction({
	lot,
	openCreate,
}: {
	lot: InventoryLotResponse;
	openCreate?: OpenCreate;
}) {
	if (!openCreate) return null;

	const urgent = needsReplenish(lot);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className={
							urgent
								? "h-8 w-8 rounded-full bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all"
								: "h-8 w-8 rounded-full text-sky-700 hover:bg-sky-500/10 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200 transition-all"
						}
						onClick={(e) => {
							e.stopPropagation();
							openCreate(buildReplenishPrefill(lot));
						}}
						aria-label={`Registrar lote nuevo en reemplazo del lote ${lot.lot_number}`}
					>
						<PackagePlus className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="left">
					<p className="text-xs">
						{urgent
							? "Este lote se está acabando — registrar lote nuevo"
							: "Registrar lote nuevo con estos datos"}
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
	close: () => void;
}) {
	if (!openCreate) return null;

	return (
		<Button
			size="sm"
			type="button"
			onClick={() => {
				close();
				// El modal de detalle debe desmontarse antes de abrir el de creación.
				setTimeout(() => openCreate(buildReplenishPrefill(lot)), 100);
			}}
			className="flex-1 sm:flex-initial bg-sky-600 font-bold text-white shadow-md transition-all duration-300 hover:bg-sky-700 hover:shadow-lg hover:-translate-y-0.5"
		>
			<PackagePlus className="h-4 w-4 sm:mr-1.5" />
			<span className="hidden sm:inline">Nuevo lote</span>
		</Button>
	);
}
