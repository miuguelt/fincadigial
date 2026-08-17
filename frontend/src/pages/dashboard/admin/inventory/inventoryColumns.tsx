import { AlertTriangle } from "lucide-react";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import type { CRUDColumn } from "@/shared/types/crud";
import { Badge } from "@/shared/ui/badge";
import { formatDateColombia } from "@/shared/utils/dateUtils";

export const inventoryColumns: CRUDColumn<InventoryLotResponse>[] = [
	{
		key: "product_name",
		label: "Producto",
		width: 230,
		render: (val: any, item: InventoryLotResponse) => {
			const isVaccine = item.product_type === "Vacuna";
			// `ck_inventory_lots_product_link` garantiza el vínculo con el producto,
			// así que `product_name` siempre viene resuelto.
			return (
				<div className="flex flex-col items-start">
					<span className="font-bold text-foreground inline-flex max-w-full items-center gap-1.5 fit-clamp">
						<span>{isVaccine ? "💉" : "💊"}</span> {val}
					</span>
					<span className="mt-1 inline-flex w-fit text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
						{item.product_type}
					</span>
				</div>
			);
		},
	},
	{
		key: "lot_number",
		label: "Lote",
		width: 150,
		render: (val: any) => (
			<Badge variant="outline" className="font-mono">
				{val}
			</Badge>
		),
	},
	{
		key: "current_quantity",
		label: "Stock actual",
		width: 160,
		render: (val: any, item: InventoryLotResponse) => (
			<div className="flex items-center gap-2">
				<span
					className={`font-bold ${item.is_low_stock ? "text-destructive" : "text-primary"}`}
				>
					{val} {item.unit}
				</span>
				{item.is_low_stock && (
					<AlertTriangle className="h-4 w-4 text-destructive" />
				)}
			</div>
		),
	},
	{
		key: "expiry_date",
		label: "Vencimiento",
		width: 180,
		render: (val: any, item: InventoryLotResponse) => (
			<div className="flex flex-col">
				<span className={item.is_expired ? "text-destructive font-bold" : ""}>
					{val ? formatDateColombia(val) : "---"}
				</span>
				{item.is_expired ? (
					<span className="text-[11px] text-destructive font-semibold">
						Vencido
					</span>
				) : item.days_to_expiry !== undefined &&
					item.days_to_expiry > 0 &&
					item.days_to_expiry <= 30 ? (
					<span className="text-[11px] text-warning font-medium">
						Vence en {item.days_to_expiry} días
					</span>
				) : null}
			</div>
		),
	},
	{
		key: "supplier",
		label: "Proveedor",
		width: 190,
		render: (val: any) => (
			<span
				className={val ? "text-foreground" : "text-muted-foreground/70 italic"}
			>
				{val || "No registrado"}
			</span>
		),
	},
];
