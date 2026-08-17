import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import type { CRUDColumn } from "@/shared/types/crud";
import { Badge } from "@/shared/ui/badge";
import { formatDateColombia } from "@/shared/utils/dateUtils";
import { InventoryStockProgressBar } from "@/widgets/admin-inventory/InventoryStockProgressBar";

export const inventoryColumns: CRUDColumn<InventoryLotResponse>[] = [
	{
		key: "product_name",
		label: "Insumo / Producto",
		width: 220,
		render: (val: any, item: InventoryLotResponse) => {
			const isVaccine = item.product_type === "Vacuna";
			return (
				<div className="flex flex-col items-start gap-1 py-0.5">
					<span className="font-bold text-foreground inline-flex max-w-full items-center gap-1.5 text-xs sm:text-sm">
						<span className="text-base">{isVaccine ? "💉" : "💊"}</span>
						<span className="truncate">{val || item.product_name || "---"}</span>
					</span>
					<span className="inline-flex w-fit text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded tracking-wider">
						{item.product_type}
					</span>
				</div>
			);
		},
	},
	{
		key: "lot_number",
		label: "N° Lote",
		width: 140,
		render: (val: any) => (
			<Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 shadow-none bg-muted/30">
				{val}
			</Badge>
		),
	},
	{
		key: "current_quantity",
		label: "Nivel de Stock (Disponibilidad)",
		width: 260,
		render: (_val: any, item: InventoryLotResponse) => (
			<div className="py-1">
				<InventoryStockProgressBar
					currentQuantity={item.current_quantity}
					initialQuantity={item.quantity}
					minStock={item.min_stock}
					unit={item.unit}
					isLowStock={item.is_low_stock}
					showMinStockLabel={true}
				/>
			</div>
		),
	},
	{
		key: "expiry_date",
		label: "Vencimiento",
		width: 170,
		render: (val: any, item: InventoryLotResponse) => (
			<div className="flex flex-col gap-0.5 text-xs">
				<span className={item.is_expired ? "text-destructive font-black" : "font-medium text-foreground"}>
					{val ? formatDateColombia(val) : "---"}
				</span>
				{item.is_expired ? (
					<span className="inline-flex items-center gap-1 text-[10px] uppercase font-black text-destructive bg-destructive/10 border border-destructive/20 w-fit px-1.5 py-0.2 rounded">
						⛔ Vencido
					</span>
				) : item.days_to_expiry !== undefined &&
					item.days_to_expiry > 0 &&
					item.days_to_expiry <= 30 ? (
					<span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 w-fit px-1.5 py-0.2 rounded">
						⚠️ Vence en {item.days_to_expiry}d
					</span>
				) : (
					<span className="text-[11px] text-muted-foreground">
						Vigente ({item.days_to_expiry ?? "—"} días)
					</span>
				)}
			</div>
		),
	},
	{
		key: "supplier",
		label: "Proveedor",
		width: 170,
		render: (val: any) => (
			<span className={val ? "text-xs font-medium text-foreground truncate max-w-[150px] inline-block" : "text-xs text-muted-foreground/70 italic"}>
				{val || "No registrado"}
			</span>
		),
	},
];
