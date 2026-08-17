import { useMemo } from "react";
import type { InventoryLotStatus } from "@/entities/inventory/api/inventory.service";
import type {
	InventoryLotInput,
	InventoryLotResponse,
} from "@/shared/api/generated/swaggerTypes";
import type { CRUDConfig } from "@/shared/types/crud";
import { InventoryFarmerGuide } from "@/widgets/admin-inventory/InventoryFarmerGuide";
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
			entityName: "Lote de Insumo",
			title: "Inventario de Insumos y Medicamentos",
			searchPlaceholder: "Buscar por lote o proveedor, insumo o notas...",
			// Sin modal de edición — los lotes no se editan directamente, se crean movimientos para auditoría
			enableEditModal: false,
			enableDelete: true,
			enableDetailModal: true,
			showDetailTimestamps: true,
			showIdInDetailTitle: false,
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
				<div className="flex items-center gap-1">
					<InventoryRestockAction lot={item} onRestock={openRestock} />
					<InventoryNewLotAction lot={item} openCreate={options?.openCreate} />
				</div>
			),

			detailActions: (item, { openCreate, close }) => (
				<InventoryNewLotDetailButton
					lot={item}
					openCreate={openCreate}
					close={close}
				/>
			),

			customToolbar: (
				<div className="space-y-2.5 w-full">
					<InventoryFilterChips
						filters={filters}
						onChange={applyFilters}
						counts={chipCounts}
					/>
					<InventoryFarmerGuide />
				</div>
			),

			customHeader: (
				<div className="mt-4 space-y-3">
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
