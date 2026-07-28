import type { InventoryLotStatus } from "@/entities/inventory/api/inventory.service";

export type InventoryProductType = "Medicamento" | "Vacuna";

export interface InventoryFilters {
	status?: InventoryLotStatus;
	product_type?: InventoryProductType;
}

export const STATUS_LABELS: Record<InventoryLotStatus, string> = {
	expired: "Vencidos",
	expiring_soon: "Vencen pronto",
	low_stock: "Stock bajo",
	ok: "Sin alertas",
};

/** Convierte el estado de filtros en los query params que espera el backend. */
export function toQueryParams(filters: InventoryFilters): Record<string, string> {
	const params: Record<string, string> = {};
	if (filters.status) params.status = filters.status;
	if (filters.product_type) params.product_type = filters.product_type;
	return params;
}

export function describeFilters(filters: InventoryFilters): string | null {
	const parts: string[] = [];
	if (filters.status) parts.push(STATUS_LABELS[filters.status]);
	if (filters.product_type) parts.push(`${filters.product_type}s`);
	return parts.length ? parts.join(" · ") : null;
}
