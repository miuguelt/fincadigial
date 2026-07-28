import { PackagePlus } from "lucide-react";
import { useMemo } from "react";
import type { InventoryLotStatus } from "@/entities/inventory/api/inventory.service";
import type {
	InventoryLotInput,
	InventoryLotResponse,
} from "@/shared/api/generated/swaggerTypes";
import type { CRUDConfig } from "@/shared/types/crud";
import { InventoryFilterChips } from "@/widgets/admin-inventory/InventoryFilterChips";
import type { InventoryFilters } from "@/widgets/admin-inventory/InventoryFilters";
import { InventoryInsights } from "@/widgets/admin-inventory/InventoryInsights";
import {
	InventoryNewLotAction,
	InventoryNewLotDetailButton,
} from "@/widgets/admin-inventory/InventoryNewLotAction";
import { InventoryReplenishBar } from "@/widgets/admin-inventory/InventoryReplenishBar";
import { InventoryRestockAction } from "@/widgets/admin-inventory/InventoryRestockAction";
import { SanidadTabs } from "@/widgets/dashboard/treatments/SanidadTabs";
import { inventoryColumns } from "./inventoryColumns";
import { inventoryFormSections } from "./inventoryForm";

export interface InventoryChipCounts {
	expired: number;
	expiring_soon: number;
	low_stock: number;
	medication: number;
	vaccine: number;
	total: number;
}

export interface UseInventoryCrudConfigArgs {
	filters: InventoryFilters;
	chipCounts?: InventoryChipCounts;
	applyFilters: (next: InventoryFilters) => void;
	toggleStatus: (status: InventoryLotStatus) => void;
	openRestock: (lot: InventoryLotResponse) => void;
}

const Legend = () => (
	<div className="flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
		<PackagePlus className="h-3.5 w-3.5 shrink-0" />
		<span>
			<span className="font-semibold text-emerald-700 dark:text-emerald-400">
				↑ Stock
			</span>{" "}
			repone unidades del mismo lote (mismo vencimiento).{" "}
			<span className="font-semibold">📦 Nuevo lote</span> crea un lote distinto
			heredando producto, unidad y proveedor — úsalo cuando el lote se acabe o
			venza. Selecciona un lote en la tabla para reponerlo desde la barra
			inferior.
		</span>
	</div>
);

export function useInventoryCrudConfig({
	filters,
	chipCounts,
	applyFilters,
	toggleStatus,
	openRestock,
}: UseInventoryCrudConfigArgs): CRUDConfig<
	InventoryLotResponse,
	InventoryLotInput
> {
	return useMemo(
		() => ({
			entityName: "Lote de Inventario",
			title: "Inventario de Insumos",
			searchPlaceholder: "Buscar por producto, lote, proveedor o notas...",
			// Sin modal de edición — los lotes no se editan, se crean movimientos
			enableEditModal: false,
			enableDelete: true,
			enableDetailModal: true,
			autoHeight: true,
			columns: inventoryColumns,
			formSections: inventoryFormSections,

			// Selección para elegir el lote por acabarse y reponerlo
			enableSelection: true,
			batchActions: (selectedIds, allItems, clearSelection, handlers) => (
				<InventoryReplenishBar
					selectedIds={selectedIds}
					items={allItems}
					clearSelection={clearSelection}
					openCreate={handlers?.openCreate}
				/>
			),

			customActions: (item, options) => (
				<>
					<InventoryRestockAction lot={item} onRestock={openRestock} />
					<InventoryNewLotAction lot={item} openCreate={options?.openCreate} />
				</>
			),

			detailActions: (item, { openCreate, close }) => (
				<InventoryNewLotDetailButton
					lot={item}
					openCreate={openCreate}
					close={close}
				/>
			),

			customToolbar: (
				<div className="space-y-2">
					<InventoryFilterChips
						filters={filters}
						onChange={applyFilters}
						counts={chipCounts}
					/>
					<Legend />
				</div>
			),

			customHeader: (
				<div className="mt-4">
					<InventoryInsights
						activeStatus={filters.status}
						onSelectStatus={toggleStatus}
					/>
					<SanidadTabs />
				</div>
			),
		}),
		[applyFilters, chipCounts, filters, openRestock, toggleStatus],
	);
}
