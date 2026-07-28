import { ArrowDownRight, ArrowUpRight, BarChart3, Clock3 } from "lucide-react";
import type { InventoryAutonomy } from "@/entities/inventory/api/inventory-analytics.service";
import type { InventoryMovementResponse } from "@/shared/api/generated/swaggerTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/ui/cn";
import { formatLongDateColombia } from "@/shared/utils/dateUtils";
import { inventoryNumber } from "./InventoryInsightMetric";

function movementIcon(type?: string) {
	if (type === "Entrada") return ArrowUpRight;
	if (type === "Salida" || type === "Baja") return ArrowDownRight;
	return BarChart3;
}

function movementTone(type?: string) {
	if (type === "Entrada") return "text-emerald-600 dark:text-emerald-400";
	if (type === "Salida" || type === "Baja") {
		return "text-orange-600 dark:text-orange-400";
	}
	return "text-primary";
}

export function InventoryMovementsCard({
	movements,
}: {
	movements: InventoryMovementResponse[];
}) {
	return (
		<Card hoverable={false} premium={false} className="min-h-0 bg-card/70">
			<CardHeader className="p-4 pb-3">
				<CardTitle className="text-base">Movimientos recientes</CardTitle>
			</CardHeader>
			<CardContent className="px-4 pb-4">
				{movements.length ? (
					<div className="divide-y divide-border/50">
						{movements.map((movement) => {
							const Icon = movementIcon(movement.movement_type);
							return (
								<div
									key={movement.id}
									className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
								>
									<Icon
										className={cn(
											"h-4 w-4 shrink-0",
											movementTone(movement.movement_type),
										)}
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold">
											{movement.movement_type} ·{" "}
											{movement.lot?.lot_number || `Lote #${movement.lot_id}`}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{formatLongDateColombia(movement.created_at)}
											{movement.reference_type
												? ` · ${movement.reference_type}`
												: ""}
										</p>
									</div>
									<span className="shrink-0 text-sm font-bold">
										{inventoryNumber.format(movement.quantity)}{" "}
										{movement.lot?.unit || "unid."}
									</span>
								</div>
							);
						})}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						No hay movimientos registrados todavía.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

// Badges sólidos: alto contraste garantizado en claro y oscuro.
const statusStyles: Record<InventoryAutonomy["status"], string> = {
	depleted: "bg-red-600 text-white",
	critical: "bg-red-600 text-white",
	warning: "bg-amber-400 text-slate-950",
	stable: "bg-emerald-600 text-white",
};
const statusLabels: Record<InventoryAutonomy["status"], string> = {
	depleted: "Sin stock",
	critical: "Crítico",
	warning: "Por revisar",
	stable: "Estable",
};

function autonomyText(item: InventoryAutonomy) {
	if (item.status === "depleted") return "Agotado";
	if (item.days_left === null) return "Sin consumo";
	return `${inventoryNumber.format(item.days_left)} días`;
}

export function InventoryAutonomyCard({
	items,
	totalGroups,
	windowDays,
	isError,
}: {
	/** Ya llegan ordenados por urgencia y acotados desde el backend. */
	items: InventoryAutonomy[];
	totalGroups: number;
	windowDays: number;
	isError: boolean;
}) {
	const hidden = Math.max(0, totalGroups - items.length);
	return (
		<Card hoverable={false} premium={false} className="min-h-0 bg-card/70">
			<CardHeader className="p-4 pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Clock3 className="h-4 w-4 text-primary" /> Autonomía estimada
				</CardTitle>
			</CardHeader>
			<CardContent className="px-4 pb-4">
				{isError ? (
					<p className="text-sm text-muted-foreground">
						No fue posible calcular la autonomía con los movimientos
						registrados.
					</p>
				) : items.length ? (
					<>
						<div className="max-h-64 divide-y divide-border/50 overflow-y-auto">
							{items.map((item) => (
								<div
									key={`${item.product}-${item.unit}`}
									className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold">
											{item.product}
										</p>
										<p className="text-xs text-muted-foreground">
											{inventoryNumber.format(item.stock)} {item.unit} · consumo
											diario {item.daily_avg}
										</p>
									</div>
									<span
										className={cn(
											"shrink-0 rounded-full px-2 py-1 text-xs font-bold",
											statusStyles[item.status],
										)}
									>
										{autonomyText(item)} · {statusLabels[item.status]}
									</span>
								</div>
							))}
						</div>
						<p className="border-t border-border/50 pt-2 text-xs text-muted-foreground">
							Consumo promedio de los últimos {windowDays} días.
							{hidden > 0 &&
								` Se muestran los ${items.length} grupos más urgentes de ${inventoryNumber.format(totalGroups)}.`}
						</p>
					</>
				) : (
					<p className="text-sm text-muted-foreground">
						No hay salidas registradas en los últimos {windowDays} días para
						proyectar consumo.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
