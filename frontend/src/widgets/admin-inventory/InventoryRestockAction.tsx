import { TrendingUp } from "lucide-react";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import { Button } from "@/shared/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";

/** Acción de fila: abre el modal de entrada de stock para sumar unidades al lote actual. */
export function InventoryRestockAction({
	lot,
	onRestock,
}: {
	lot: InventoryLotResponse;
	onRestock: (lot: InventoryLotResponse) => void;
}) {
	if (lot.is_expired) return null;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-9 px-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-xs gap-1.5"
						onClick={(e) => {
							e.stopPropagation();
							onRestock(lot);
						}}
						aria-label={`Registrar entrada de stock para lote ${lot.lot_number}`}
					>
						<TrendingUp className="h-4 w-4 shrink-0" />
						<span className="hidden xl:inline">Entrar Stock</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p className="text-xs font-medium">
						📥 <strong>Entrar Stock:</strong> Sumar más unidades a este mismo lote
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
