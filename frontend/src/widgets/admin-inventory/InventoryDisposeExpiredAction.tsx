import { Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import { inventoryService } from "@/entities/inventory/api/inventory.service";
import { useToast } from "@/app/providers/ToastContext";
import { Button } from "@/shared/ui/button";

export function InventoryDisposeExpiredAction({
  lot,
  onSuccess,
}: {
  lot: InventoryLotResponse;
  onSuccess?: () => void | Promise<void>;
}) {
  const { showToast } = useToast();
  if (!lot.is_expired || Number(lot.current_quantity) <= 0) return null;

  const dispose = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await inventoryService.disposeExpiredLot(lot.id);
      showToast("Lote vencido dado de baja y retirado del saldo", "success");
      await onSuccess?.();
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo dar de baja el lote", "error");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={dispose}
      className="h-9 rounded-xl border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground"
      aria-label={`Dar de baja lote vencido ${lot.lot_number}`}
    >
      <Trash2 className="h-4 w-4" />
      <span className="hidden xl:inline">Dar de baja</span>
    </Button>
  );
}
