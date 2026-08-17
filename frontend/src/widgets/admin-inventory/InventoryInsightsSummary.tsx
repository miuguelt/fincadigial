import {
	AlertTriangle,
	Boxes,
	CalendarClock,
	DollarSign,
	Package,
} from "lucide-react";
import type {
	InventoryLotStatus,
	InventorySummary,
} from "@/entities/inventory/api/inventory.service";
import { formatCurrencyColombia } from "@/shared/utils/dateUtils";
import { InventoryMetric, inventoryNumber } from "./InventoryInsightMetric";

function getSummaryMessage(summary: InventorySummary) {
	if (summary.total_lots === 0) {
		return "Aún no hay lotes registrados para analizar.";
	}
	if (summary.expired_lots > 0) {
		return `${inventoryNumber.format(summary.expired_lots)} lote(s) vencido(s) requieren gestión inmediata.`;
	}
	if (summary.expiring_soon_lots > 0) {
		return `${inventoryNumber.format(summary.expiring_soon_lots)} lote(s) vencen pronto; revisa su uso o reposición.`;
	}
	if (summary.low_stock_lots > 0) {
		return `${inventoryNumber.format(summary.low_stock_lots)} lote(s) están por debajo del stock mínimo configurado.`;
	}
	return "No hay alertas de vencimiento ni stock bajo en los lotes actuales.";
}

export function InventorySummaryIntro({
	summary,
}: {
	summary: InventorySummary;
}) {
	return (
		<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
					Análisis de datos
				</p>
				<h2
					id="inventory-insights-title"
					className="text-lg font-black tracking-tight sm:text-xl"
				>
					Qué tienes y qué está cambiando
				</h2>
			</div>
			<p className="max-w-xl text-xs text-muted-foreground sm:text-right">
				{getSummaryMessage(summary)}
			</p>
		</div>
	);
}

export function InventorySummaryMetrics({
	summary,
	activeStatus,
	onSelectStatus,
}: {
	summary: InventorySummary;
	activeStatus?: InventoryLotStatus;
	/** Filtra la tabla por el bucket correspondiente. */
	onSelectStatus?: (status: InventoryLotStatus) => void;
}) {
	const expiredValueDetail = summary.expired_value
		? `${formatCurrencyColombia(summary.expired_value)} inmovilizado en vencidos`
		: "Stock actual × costo unitario";

	return (
		/*
		 * `auto-fit` con `minmax(min(100%, 190px), 1fr)`: la tira decide cuántas
		 * columnas caben por el ancho real disponible —no por el del viewport—,
		 * así que sirve igual en una barra lateral abierta que a 2560 px.
		 */
		<div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))]">
			<InventoryMetric
				icon={Package}
				label="Lotes registrados"
				value={inventoryNumber.format(summary.total_lots)}
				detail={`${inventoryNumber.format(summary.medication_lots)} medicamentos · ${inventoryNumber.format(summary.vaccine_lots)} vacunas`}
			/>
			<InventoryMetric
				icon={DollarSign}
				label="Valor estimado"
				value={formatCurrencyColombia(summary.total_estimated_value)}
				detail={expiredValueDetail}
				className="text-emerald-600 dark:text-emerald-400"
			/>
			<InventoryMetric
				icon={AlertTriangle}
				label="Lotes vencidos"
				value={inventoryNumber.format(summary.expired_lots)}
				detail="Requieren atención inmediata"
				className={
					summary.expired_lots
						? "text-destructive"
						: "text-emerald-600 dark:text-emerald-400"
				}
				active={activeStatus === "expired"}
				onClick={
					summary.expired_lots && onSelectStatus
						? () => onSelectStatus("expired")
						: undefined
				}
			/>
			<InventoryMetric
				icon={CalendarClock}
				label="Vencen pronto"
				value={inventoryNumber.format(summary.expiring_soon_lots)}
				detail="Dentro de los próximos 30 días"
				className={
					summary.expiring_soon_lots
						? "text-orange-600 dark:text-orange-400"
						: "text-emerald-600 dark:text-emerald-400"
				}
				active={activeStatus === "expiring_soon"}
				onClick={
					summary.expiring_soon_lots && onSelectStatus
						? () => onSelectStatus("expiring_soon")
						: undefined
				}
			/>
			<InventoryMetric
				icon={Boxes}
				label="Stock bajo"
				value={inventoryNumber.format(summary.low_stock_lots)}
				detail="Bajo el mínimo configurado"
				className={
					summary.low_stock_lots
						? "text-orange-600 dark:text-orange-400"
						: "text-emerald-600 dark:text-emerald-400"
				}
				active={activeStatus === "low_stock"}
				onClick={
					summary.low_stock_lots && onSelectStatus
						? () => onSelectStatus("low_stock")
						: undefined
				}
			/>
		</div>
	);
}
