import React, { useState, useMemo, useCallback } from "react";
import { AdminCRUDPage } from "@/widgets/admin-crud";
import {
	inventoryService,
	type InventoryLotStatus,
} from "@/entities/inventory/api/inventory.service";
import type {
	InventoryLotResponse,
	InventoryLotInput,
} from "@/shared/api/generated/swaggerTypes";
import { useInventory } from "@/entities/inventory/model/useInventory";
import {
	useInventoryCrudConfig,
	type InventoryChipCounts,
} from "./useInventoryCrudConfig";
import { initialInventoryFormData, mapResponseToForm } from "./inventoryForm";
import type { InventoryFilters } from "@/widgets/admin-inventory/InventoryFilters";
import { toQueryParams } from "@/widgets/admin-inventory/InventoryFilters";
import { InventoryRestockModal } from "@/widgets/admin-inventory/InventoryRestockModal";
import { InventoryDetailView } from "@/widgets/admin-inventory/InventoryDetailView";

const InventoryPage: React.FC = () => {
	const [filters, setFilters] = useState<InventoryFilters>({});
	const [restockLot, setRestockLot] = useState<InventoryLotResponse | null>(null);
	const [isRestockOpen, setIsRestockOpen] = useState(false);

	const { useSummary } = useInventory();
	const summaryQuery = useSummary();
	const summary = summaryQuery.data;

	const chipCounts: InventoryChipCounts | undefined = useMemo(() => {
		if (!summary) return undefined;
		return {
			expired: summary.expired_lots,
			expiring_soon: summary.expiring_soon_lots,
			low_stock: summary.low_stock_lots,
			medication: summary.medication_lots,
			vaccine: summary.vaccine_lots,
			total: summary.total_lots,
		};
	}, [summary]);

	const applyFilters = useCallback((next: InventoryFilters) => {
		setFilters(next);
	}, []);

	const toggleStatus = useCallback((status: InventoryLotStatus) => {
		setFilters((prev) => ({
			...prev,
			status: prev.status === status ? undefined : status,
		}));
	}, []);

	const openRestock = useCallback((lot: InventoryLotResponse) => {
		setRestockLot(lot);
		setIsRestockOpen(true);
	}, []);

	const closeRestock = useCallback(() => {
		setIsRestockOpen(false);
		setRestockLot(null);
	}, []);

	const crudConfig = useInventoryCrudConfig({
		filters,
		chipCounts,
		applyFilters,
		toggleStatus,
		openRestock,
	});

	const queryParams = useMemo(() => toQueryParams(filters), [filters]);

	return (
		<>
			<AdminCRUDPage<InventoryLotResponse, InventoryLotInput>
				config={crudConfig}
				service={inventoryService}
				initialFormData={initialInventoryFormData}
				mapResponseToForm={mapResponseToForm}
				filters={queryParams}
				realtime={true}
				enhancedHover={true}
				customDetailContent={(item, handlers: any) => (
					<InventoryDetailView
						lot={item}
						onRestock={openRestock}
						openCreate={handlers?.openCreate}
						close={handlers?.close}
					/>
				)}
			/>

			<InventoryRestockModal
				lot={restockLot}
				open={isRestockOpen}
				onClose={closeRestock}
				onSuccess={() => {
					summaryQuery.refetch();
				}}
			/>
		</>
	);
};

export default InventoryPage;
