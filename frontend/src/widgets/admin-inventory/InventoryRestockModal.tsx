/**
 * InventoryRestockModal
 *
 * Modal para registrar una ENTRADA de stock en un lote existente.
 * Crea un InventoryMovement tipo "Entrada" — NO modifica el lote directamente.
 * Esto preserva la trazabilidad completa de movimientos para estadísticas y auditoría.
 */

import { CheckCircle2, Plus, TrendingUp, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { inventoryService } from "@/entities/inventory/api/inventory.service";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import { useToast } from "@/app/providers/ToastContext";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

interface InventoryRestockModalProps {
	lot: InventoryLotResponse | null;
	open: boolean;
	onClose: () => void;
	onSuccess?: () => void | Promise<void>;
}

const QUICK_INCREMENTS = [5, 10, 20, 50, 100];

export function InventoryRestockModal({
	lot,
	open,
	onClose,
	onSuccess,
}: InventoryRestockModalProps) {
	const { showToast } = useToast();
	const [quantity, setQuantity] = useState<string>("");
	const [notes, setNotes] = useState<string>("");
	const [saving, setSaving] = useState(false);

	const handleClose = () => {
		setQuantity("");
		setNotes("");
		onClose();
	};

	const handleQuickAdd = (amount: number) => {
		const currentVal = parseFloat(quantity) || 0;
		setQuantity(String(currentVal + amount));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!lot) return;

		const qty = parseFloat(quantity);
		if (isNaN(qty) || qty <= 0) {
			showToast("La cantidad a ingresar debe ser un número mayor a 0.", "error");
			return;
		}

		setSaving(true);
		try {
			await inventoryService.createMovement({
				lot_id: lot.id,
				movement_type: "Entrada",
				quantity: qty,
				reference_type: "restock_manual",
				notes: notes.trim() || undefined,
			});

			const productName = lot.product_name || `Lote ${lot.lot_number}`;
			showToast(
				`✅ Se registraron +${qty} ${lot.unit} para ${productName}. Nuevo stock: ${newStock} ${lot.unit}.`,
				"success"
			);

			setQuantity("");
			setNotes("");
			await onSuccess?.();
			onClose();
		} catch (err: any) {
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				"No se pudo registrar la entrada de stock. Intente de nuevo.";
			showToast(msg, "error");
		} finally {
			setSaving(false);
		}
	};

	if (!lot) return null;

	const qtyNum = parseInt(quantity, 10) || 0;
	const currentStock = Number(lot.current_quantity) || 0;
	const newStock = currentStock + qtyNum;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/80 shadow-2xl">
				{/* Cabecera atractiva con tono esmeralda */}
				<div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-xl font-black text-white">
							<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">
								<TrendingUp className="h-5 w-5 text-white" />
							</div>
							Registrar Entrada de Stock
						</DialogTitle>
						<DialogDescription className="text-emerald-100 text-xs mt-1">
							Suma frascos o dosis al lote existente manteniendo la trazabilidad histórica de la finca.
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="p-5 space-y-4">
					{/* Tarjeta de información del lote seleccionado */}
					<div className="rounded-xl border border-border/70 bg-muted/40 p-4 space-y-3 shadow-sm">
						<div className="flex items-start justify-between gap-3">
							<div className="space-y-1">
								<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
									Insumo / Producto
								</span>
								<h4 className="font-black text-base text-foreground flex items-center gap-2">
									<span>{lot.product_type === "Vacuna" ? "💉" : "💊"}</span>
									{lot.product_name || "Producto sin nombre"}
								</h4>
							</div>
							<div className="text-right space-y-1">
								<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
									N° Lote
								</span>
								<div>
									<Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
										{lot.lot_number}
									</Badge>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-xs">
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground">Stock actual en bodega:</span>
								<span
									className={`font-black text-sm ${
										lot.is_low_stock ? "text-destructive" : "text-foreground"
									}`}
								>
									{currentStock} {lot.unit}
								</span>
								{lot.is_low_stock && (
									<span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
										<TriangleAlert className="h-3 w-3" /> Bajo
									</span>
								)}
							</div>
							{lot.supplier && (
								<span className="text-muted-foreground fit-clamp max-w-[180px]">
									Prov: {lot.supplier}
								</span>
							)}
						</div>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Cantidad a ingresar */}
						<div className="space-y-2">
							<Label htmlFor="restock-qty" className="font-bold text-sm text-foreground flex items-center justify-between">
								<span>¿Cuántas unidades llegaron?</span>
								<span className="text-xs font-normal text-muted-foreground">
									Unidad: <strong className="text-foreground">{lot.unit}</strong>
								</span>
							</Label>
							<Input
								id="restock-qty"
								type="number"
								min={1}
								step={0.001}
								placeholder={`Ej: 50`}
								value={quantity}
								onChange={(e) => setQuantity(e.target.value)}
								required
								autoFocus
								className="text-xl font-black h-12 text-center tracking-wider bg-background border-2 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
							/>

							{/* Botones de incremento rápido (+5, +10, +20, +50, +100) */}
							<div className="flex flex-wrap items-center gap-1.5 pt-1">
								<span className="text-[11px] font-semibold text-muted-foreground mr-1">
									Suma rápida:
								</span>
								{QUICK_INCREMENTS.map((amt) => (
									<Button
										key={amt}
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleQuickAdd(amt)}
										className="h-7 px-2.5 text-xs font-bold rounded-lg border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 active:scale-95"
									>
										<Plus className="h-3 w-3 mr-0.5" />
										{amt}
									</Button>
								))}
							</div>
						</div>

						{/* Previsualización del stock final */}
						{qtyNum > 0 && (
							<div className="rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 p-3.5 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
								<div className="space-y-0.5">
									<div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
										<CheckCircle2 className="h-4 w-4 text-emerald-600" />
										Nuevo Stock Disponible
									</div>
									<div className="text-[11px] text-muted-foreground">
										{currentStock} (anterior) + {qtyNum} (entrada)
									</div>
								</div>
								<div className="text-right">
									<span className="font-black text-2xl text-emerald-700 dark:text-emerald-300">
										{newStock}
									</span>{" "}
									<span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
										{lot.unit}
									</span>
								</div>
							</div>
						)}

						{/* Observaciones opcionales */}
						<div className="space-y-1.5">
							<Label htmlFor="restock-notes" className="font-medium text-xs text-foreground">
								Observaciones o Comprobante{" "}
								<span className="text-muted-foreground font-normal">(Opcional)</span>
							</Label>
							<Textarea
								id="restock-notes"
								placeholder="Ej: Factura #1234 de Agropecuaria El Triunfo, compra mensual..."
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={2}
								className="resize-none text-xs"
							/>
						</div>

						<DialogFooter className="gap-2 pt-2 sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={handleClose}
								disabled={saving}
								className="h-11 px-5 font-semibold"
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={saving || qtyNum <= 0}
								className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black gap-2 shadow-md hover:shadow-lg transition-all"
							>
								<TrendingUp className="h-4 w-4" />
								{saving ? "Registrando…" : `Guardar Entrada (+${qtyNum || 0} ${lot.unit})`}
							</Button>
						</DialogFooter>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
