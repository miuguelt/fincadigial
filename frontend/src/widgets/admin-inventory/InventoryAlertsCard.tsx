import { ChevronRight } from "lucide-react";
import type {
	InventoryAlerts,
	InventoryLotStatus,
	InventorySummary,
} from "@/entities/inventory/api/inventory.service";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/ui/cn";
import { formatDateColombia } from "@/shared/utils/dateUtils";
import { inventoryNumber } from "./InventoryInsightMetric";

const PREVIEW = 3;

interface Bucket {
	status: InventoryLotStatus;
	label: string;
	tone: string;
	count: number;
	lots: InventoryLotResponse[];
	describe: (lot: InventoryLotResponse) => string;
}

function lotName(lot: InventoryLotResponse) {
	return (lot as any).product_name || lot.lot_number || `Lote #${lot.id}`;
}

export function InventoryAlertsCard({
	summary,
	alerts,
	isError,
	activeStatus,
	onSelectStatus,
}: {
	summary: InventorySummary;
	alerts?: InventoryAlerts;
	isError: boolean;
	activeStatus?: InventoryLotStatus;
	onSelectStatus?: (status: InventoryLotStatus) => void;
}) {
	const buckets: Bucket[] = [
		{
			status: "expired",
			label: "Vencidos",
			tone: "text-destructive",
			count: summary.expired_lots,
			lots: alerts?.expired ?? [],
			describe: (lot) =>
				`Venció el ${formatDateColombia(lot.expiry_date as any)}`,
		},
		{
			status: "expiring_soon",
			label: "Vencen pronto",
			tone: "text-orange-600 dark:text-orange-400",
			count: summary.expiring_soon_lots,
			lots: alerts?.expiring_soon ?? [],
			describe: (lot) =>
				`Vence en ${(lot as any).days_to_expiry ?? "?"} días`,
		},
		{
			status: "low_stock",
			label: "Stock bajo",
			tone: "text-amber-600 dark:text-amber-400",
			count: summary.low_stock_lots,
			lots: alerts?.low_stock ?? [],
			describe: (lot) =>
				`Quedan ${inventoryNumber.format(lot.current_quantity as any)} ${lot.unit} (mín. ${lot.min_stock ?? "—"})`,
		},
	];

	const nothingPending = buckets.every((bucket) => bucket.count === 0);

	return (
		<Card hoverable={false} premium={false} className="min-h-0 bg-card/70">
			<CardHeader className="p-4 pb-3">
				<CardTitle className="text-base">
					Alertas que requieren atención
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 px-4 pb-4">
				{buckets.map((bucket) => {
					const active = activeStatus === bucket.status;
					const preview = bucket.lots.slice(0, PREVIEW);
					return (
						<div
							key={bucket.status}
							className={cn(
								"rounded-lg border border-border/50",
								active && "border-primary ring-1 ring-primary",
							)}
						>
							<button
								type="button"
								disabled={!bucket.count || !onSelectStatus}
								onClick={() => onSelectStatus?.(bucket.status)}
								aria-pressed={active}
								className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors enabled:hover:bg-muted/60 disabled:cursor-default"
							>
								<span className="text-sm font-medium">{bucket.label}</span>
								<span className="flex items-center gap-1">
									<span className={cn("text-lg font-black", bucket.tone)}>
										{inventoryNumber.format(bucket.count)}
									</span>
									{Boolean(bucket.count) && onSelectStatus && (
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									)}
								</span>
							</button>
							{preview.length > 0 && (
								<ul className="space-y-0.5 border-t border-border/40 px-3 py-2">
									{preview.map((lot) => (
										<li
											key={lot.id}
											className="flex items-baseline justify-between gap-2 text-xs"
										>
											<span className="fit-clamp font-semibold">
												{lotName(lot)}
											</span>
											<span className="shrink-0 text-muted-foreground">
												{bucket.describe(lot)}
											</span>
										</li>
									))}
									{bucket.count > preview.length && (
										<li className="pt-1 text-[11px] font-bold text-primary">
											+{inventoryNumber.format(bucket.count - preview.length)}{" "}
											más — clic en el total para filtrarlos
										</li>
									)}
								</ul>
							)}
						</div>
					);
				})}
				{isError && (
					<p className="text-xs text-muted-foreground">
						Los totales provienen del resumen; no fue posible cargar el detalle
						de los lotes prioritarios.
					</p>
				)}
				{nothingPending && (
					<p className="pt-1 text-xs text-emerald-600 dark:text-emerald-400">
						No hay lotes pendientes de revisión.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
