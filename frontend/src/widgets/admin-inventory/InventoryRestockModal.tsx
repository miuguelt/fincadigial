/**
 * InventoryRestockModal
 *
 * Modal para registrar una ENTRADA de stock en un lote existente.
 * Crea un InventoryMovement tipo "Entrada" — NO modifica el lote directamente.
 * Esto preserva la trazabilidad completa de movimientos para estadísticas.
 */

import { Package, TrendingUp, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { inventoryService } from "@/entities/inventory/api/inventory.service";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import { useToast } from "@/shared/hooks/use-toast";
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
	onSuccess: () => void;
}

export function InventoryRestockModal({
	lot,
	open,
	onClose,
	onSuccess,
}: InventoryRestockModalProps) {
	const { toast } = useToast();
	const [quantity, setQuantity] = useState<string>("");
	const [notes, setNotes] = useState<string>("");
	const [saving, setSaving] = useState(false);

	const handleClose = () => {
		setQuantity("");
		setNotes("");
		onClose();
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!lot) return;

		const qty = parseInt(quantity, 10);
		if (isNaN(qty) || qty <= 0) {
			toast({
				description: "La cantidad debe ser un número mayor a 0.",
				variant: "destructive",
			});
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
			toast({
				description: `✅ Entrada de ${qty} ${lot.unit} registrada para lote ${lot.lot_number}. Stock actualizado.`,
			});
			setQuantity("");
			setNotes("");
			onSuccess();
			onClose();
		} catch (err: any) {
			const msg =
				err?.message || "No se pudo registrar el movimiento. Intente de nuevo.";
			toast({ description: msg, variant: "destructive" });
		} finally {
			setSaving(false);
		}
	};

	if (!lot) return null;

	const newStock = lot.current_quantity + (parseInt(quantity, 10) || 0);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg">
						<TrendingUp className="h-5 w-5 text-emerald-500" />
						Registrar entrada de stock
					</DialogTitle>
					<DialogDescription>
						Se creará un movimiento de{" "}
						<span className="font-semibold text-foreground">Entrada</span> para
						mantener la trazabilidad completa del inventario.
					</DialogDescription>
				</DialogHeader>

				{/* Resumen del lote seleccionado */}
				<div className="rounded-xl border border-border/60 bg-muted/40 p-4 space-y-2">
					<div className="flex items-center gap-2">
						<Package className="h-4 w-4 text-muted-foreground" />
						<span className="font-semibold text-sm text-foreground">
							{lot.product_name || "---"}
						</span>
						<Badge variant="outline" className="font-mono text-xs">
							{lot.lot_number}
						</Badge>
					</div>
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<span>
							Stock actual:{" "}
							<span
								className={`font-bold ${lot.is_low_stock ? "text-destructive" : "text-foreground"}`}
							>
								{lot.current_quantity} {lot.unit}
							</span>
						</span>
						{lot.is_low_stock && (
							<span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
								<TriangleAlert className="h-3 w-3" />
								Stock bajo
							</span>
						)}
					</div>
					{lot.supplier && (
						<span className="text-xs text-muted-foreground">
							Proveedor: {lot.supplier}
						</span>
					)}
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Cantidad a ingresar */}
					<div className="space-y-1.5">
						<Label htmlFor="restock-qty" className="font-medium">
							Cantidad a ingresar{" "}
							<span className="text-muted-foreground font-normal">
								({lot.unit})
							</span>
						</Label>
						<Input
							id="restock-qty"
							type="number"
							min={1}
							step={1}
							placeholder="Ej: 50"
							value={quantity}
							onChange={(e) => setQuantity(e.target.value)}
							required
							autoFocus
							className="text-lg font-semibold"
						/>
					</div>

					{/* Preview del nuevo stock */}
					{quantity && parseInt(quantity, 10) > 0 && (
						<div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 flex items-center justify-between">
							<span className="text-sm text-emerald-700 dark:text-emerald-300">
								Nuevo stock total
							</span>
							<span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
								{newStock} {lot.unit}
							</span>
						</div>
					)}

					{/* Observaciones opcionales */}
					<div className="space-y-1.5">
						<Label htmlFor="restock-notes" className="font-medium">
							Observaciones{" "}
							<span className="text-muted-foreground font-normal">
								(opcional)
							</span>
						</Label>
						<Textarea
							id="restock-notes"
							placeholder="Ej: Compra factura #123, proveedor Distribuciones Norte..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={2}
							className="resize-none"
						/>
					</div>

					<DialogFooter className="gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={saving}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={saving || !quantity || parseInt(quantity, 10) <= 0}
							className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
						>
							<TrendingUp className="h-4 w-4" />
							{saving ? "Registrando…" : "Registrar entrada"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
