import { describe, expect, it } from "vitest";
import type { InventoryLotResponse } from "@/shared/api/generated/swaggerTypes";
import {
	countInventoryAttention,
	getInventoryAttentionReason,
} from "./inventoryReplenish";

const makeLot = (
	overrides: Partial<InventoryLotResponse> = {},
): InventoryLotResponse => ({
	id: 1,
	product_type: "Medicamento",
	lot_number: "VITA-2024-002",
	quantity: 12,
	current_quantity: 12,
	unit: "frascos",
	expiry_date: "2026-02-28",
	min_stock: 2,
	...overrides,
});

describe("inventory attention classification", () => {
	it("does not label a full expired lot as por acabarse", () => {
		expect(getInventoryAttentionReason(makeLot({ is_expired: true }))).toBe(
			"expired",
		);
	});

	it("keeps low stock and agotado as different warnings", () => {
		expect(
			getInventoryAttentionReason(
				makeLot({ current_quantity: 2, is_low_stock: true }),
			),
		).toBe("low_stock");
		expect(
			getInventoryAttentionReason(
				makeLot({ current_quantity: 0, is_low_stock: true }),
			),
		).toBe("out_of_stock");
	});

	it("counts each visible warning by its real reason", () => {
		expect(
			countInventoryAttention([
				makeLot({ id: 1, is_expired: true }),
				makeLot({ id: 2, current_quantity: 2, is_low_stock: true }),
				makeLot({ id: 3, current_quantity: 0 }),
			]),
		).toEqual({ expired: 1, out_of_stock: 1, low_stock: 1 });
	});
});
