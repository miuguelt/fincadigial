import {
	Calendar,
	Package,
	TrendingUp,
	Truck,
	FileText,
	AlertTriangle,
} from "lucide-react";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { formatCurrencyColombia, formatDateColombia } from "@/shared/utils/dateUtils";
import { InventoryStockProgressBar } from "./InventoryStockProgressBar";
import { InventoryNewLotDetailButton } from "./InventoryNewLotAction";

export interface InventoryDetailViewProps {
	lot: InventoryLotResponse;
	onRestock?: (lot: InventoryLotResponse) => void;
	openCreate?: (prefill?: any) => void;
	close?: () => void;
}

export function InventoryDetailView({
	lot,
	onRestock,
	openCreate,
	close,
}: InventoryDetailViewProps) {
	const isVaccine = lot.product_type === "Vacuna";
	const currentStock = Number(lot.current_quantity) || 0;
	const initialStock = Number(lot.quantity) || currentStock;
	const minStock = Number(lot.min_stock) || 5;
	const unitCost = Number(lot.unit_cost) || 0;
	const totalValue = currentStock * unitCost;

	return (
		<div className="space-y-4 py-1">
			{/* Encabezado del Insumo */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/60 bg-gradient-to-r from-card via-muted/30 to-card p-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-2xl shrink-0 shadow-inner">
						{isVaccine ? "💉" : "💊"}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
								{lot.product_type}
							</span>
							<Badge variant="outline" className="font-mono text-xs font-bold">
								Lote: {lot.lot_number}
							</Badge>
						</div>
						<h3 className="text-lg font-black text-foreground mt-1">
							{lot.product_name || "Producto sin nombre"}
						</h3>
					</div>
				</div>

				{onRestock && (
					<Button
						type="button"
						onClick={() => onRestock(lot)}
						className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md transition-all shrink-0"
					>
						<TrendingUp className="h-4 w-4" />
						<span>Entrar Stock</span>
					</Button>
				)}
			</div>

			{/* Tarjeta Destacada de Stock y Testigo Gráfico */}
			<Card className="border-border/60 shadow-sm overflow-hidden bg-card/80">
				<CardContent className="p-4 sm:p-5 space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
							<Package className="h-4 w-4 text-emerald-600" />
							Disponibilidad y Nivel de Stock
						</span>
						{lot.is_low_stock && (
							<span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
								<AlertTriangle className="h-3.5 w-3.5" /> Stock por debajo del mínimo
							</span>
						)}
					</div>

					<div className="w-full">
						<InventoryStockProgressBar
							currentQuantity={currentStock}
							initialQuantity={initialStock}
							minStock={minStock}
							unit={lot.unit}
							isLowStock={lot.is_low_stock}
							showMinStockLabel={true}
							className="max-w-none"
						/>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/50 pt-3 text-xs">
						<div className="space-y-0.5">
							<span className="text-muted-foreground font-medium">Stock Actual:</span>
							<div className="font-black text-sm text-foreground">
								{currentStock} {lot.unit}
							</div>
						</div>
						<div className="space-y-0.5">
							<span className="text-muted-foreground font-medium">Cantidad Inicial:</span>
							<div className="font-bold text-sm text-foreground">
								{initialStock} {lot.unit}
							</div>
						</div>
						<div className="space-y-0.5">
							<span className="text-muted-foreground font-medium">Mínimo de Alerta:</span>
							<div className="font-bold text-sm text-foreground">
								{minStock} {lot.unit}
							</div>
						</div>
						<div className="space-y-0.5">
							<span className="text-muted-foreground font-medium">Unidad de Medida:</span>
							<div className="font-bold text-sm text-foreground uppercase">
								{lot.unit}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Grid de Fechas y Proveedor */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{/* Vencimiento */}
				<Card className="border-border/60 shadow-sm bg-card/80">
					<CardContent className="p-4 space-y-2.5">
						<div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
							<Calendar className="h-4 w-4 text-sky-600" />
							Vencimiento y Tiempos
						</div>

						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<span className="text-xs text-muted-foreground">Fecha de Vencimiento:</span>
								<span
									className={`text-sm font-black ${
										lot.is_expired ? "text-destructive" : "text-foreground"
									}`}
								>
									{lot.expiry_date ? formatDateColombia(lot.expiry_date as any) : "---"}
								</span>
							</div>

							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Estado de vida útil:</span>
								{lot.is_expired ? (
									<Badge variant="destructive" className="font-bold text-[11px]">
										Vencido
									</Badge>
								) : lot.days_to_expiry !== undefined && lot.days_to_expiry <= 30 ? (
									<Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold text-[11px]">
										Vence en {lot.days_to_expiry} días
									</Badge>
								) : (
									<Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-bold text-[11px]">
										Vigente ({lot.days_to_expiry ?? "—"} días)
									</Badge>
								)}
							</div>

							{lot.entry_date && (
								<div className="flex items-center justify-between text-xs pt-1 text-muted-foreground">
									<span>Fecha de ingreso a finca:</span>
									<span className="font-medium text-foreground">
										{formatDateColombia(lot.entry_date as any)}
									</span>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Proveedor y Valor */}
				<Card className="border-border/60 shadow-sm bg-card/80">
					<CardContent className="p-4 space-y-2.5">
						<div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
							<Truck className="h-4 w-4 text-violet-600" />
							Proveedor y Costos
						</div>

						<div className="space-y-1 text-xs">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Proveedor:</span>
								<span className="font-bold text-foreground truncate max-w-[170px]">
									{lot.supplier || "No especificado"}
								</span>
							</div>

							{unitCost > 0 && (
								<>
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground">Costo por {lot.unit}:</span>
										<span className="font-bold text-foreground">
											{formatCurrencyColombia(unitCost)}
										</span>
									</div>
									<div className="flex items-center justify-between border-t border-border/40 pt-1">
										<span className="text-muted-foreground font-medium">Valor inventario actual:</span>
										<span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
											{formatCurrencyColombia(totalValue)}
										</span>
									</div>
								</>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Observaciones */}
			{lot.notes && (
				<Card className="border-border/60 shadow-sm bg-card/80">
					<CardContent className="p-4 space-y-1.5">
						<div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
							<FileText className="h-4 w-4 text-amber-600" />
							Observaciones de campo
						</div>
						<p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40 whitespace-pre-wrap">
							{lot.notes}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Acciones en el pie del detalle */}
			<div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
				<InventoryNewLotDetailButton
					lot={lot}
					openCreate={openCreate}
					close={close}
				/>
			</div>
		</div>
	);
}
