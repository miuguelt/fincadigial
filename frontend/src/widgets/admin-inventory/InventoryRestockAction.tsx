import { TrendingUp } from "lucide-react";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import { Button } from "@/shared/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";

/** Acción de fila: abre el modal de entrada de stock sin disparar el detalle. */
export function InventoryRestockAction({
	lot,
	onRestock,
}: {
	lot: InventoryLotResponse;
	onRestock: (lot: InventoryLotResponse) => void;
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-all"
						onClick={(e) => {
							e.stopPropagation();
							onRestock(lot);
						}}
						aria-label={`Registrar entrada de stock para lote ${lot.lot_number}`}
					>
						<TrendingUp className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="left">
					<p className="text-xs">Registrar entrada de stock</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
