import type {
	InventoryLotInput,
	InventoryLotResponse,
} from "@/shared/api/generated/swaggerTypes";

/** Meses de vida útil por defecto para el lote de reposición. */
const DEFAULT_SHELF_LIFE_MONTHS = 12;

export type InventoryAttentionReason =
	| "expired"
	| "out_of_stock"
	| "low_stock";

export interface InventoryAttentionCounts {
	expired: number;
	out_of_stock: number;
	low_stock: number;
}

const toDateInput = (value: unknown): string => {
	if (!value) return "";
	return typeof value === "string" ? value.split("T")[0] : String(value);
};

function addMonths(iso: string, months: number): string {
	const [y, m, d] = iso.split("-").map(Number);
	// Día 0 del mes siguiente = último día del mes destino; evita el desborde
	// de "31 de enero + 1 mes" a marzo.
	const lastDay = new Date(y, m - 1 + months + 1, 0).getDate();
	const target = new Date(y, m - 1 + months, Math.min(d, lastDay));
	const mm = String(target.getMonth() + 1).padStart(2, "0");
	const dd = String(target.getDate()).padStart(2, "0");
	return `${target.getFullYear()}-${mm}-${dd}`;
}

/** Vida útil observada del lote agotado; si no se puede inferir, 12 meses. */
function inferShelfLife(lot: InventoryLotResponse): number {
	const entry = toDateInput(lot.entry_date);
	const expiry = toDateInput(lot.expiry_date);
	if (!entry || !expiry) return DEFAULT_SHELF_LIFE_MONTHS;
	const months =
		(Number(expiry.slice(0, 4)) - Number(entry.slice(0, 4))) * 12 +
		(Number(expiry.slice(5, 7)) - Number(entry.slice(5, 7)));
	return months > 0 ? months : DEFAULT_SHELF_LIFE_MONTHS;
}

/**
 * Datos del lote de reemplazo a partir del que se está acabando.
 *
 * Se heredan producto, unidad, proveedor, costo y stock mínimo — lo que
 * identifica *qué* se repone. NO se heredan `lot_number` ni `quantity`: son
 * propios del lote físico nuevo y deben escribirse a mano.
 */
export function buildReplenishPrefill(
	lot: InventoryLotResponse,
): Partial<InventoryLotInput> {
	const today = new Date().toISOString().split("T")[0];

	return {
		product_type: lot.product_type,
		medication_id: lot.medication_id,
		vaccine_id: lot.vaccine_id,
		lot_number: "",
		quantity: 0,
		unit: lot.unit,
		entry_date: today,
		expiry_date: addMonths(today, inferShelfLife(lot)),
		min_stock: lot.min_stock,
		supplier: lot.supplier,
		unit_cost: lot.unit_cost,
		notes: `Reposición del lote ${lot.lot_number}`,
	} as Partial<InventoryLotInput>;
}

/** Clasifica el motivo que requiere atención en un lote visible. */
export function getInventoryAttentionReason(
	lot: InventoryLotResponse,
): InventoryAttentionReason | null {
	const isExpired =
	lot.is_expired === true ||
	(typeof lot.days_to_expiry === "number" && lot.days_to_expiry < 0);
	if (isExpired) return "expired";

	const currentQuantity = Number(lot.current_quantity);
	if (currentQuantity <= 0) return "out_of_stock";
	if (lot.is_low_stock) return "low_stock";
	return null;
}

/** Cuenta los motivos de atención sin mezclar vencimiento con bajo stock. */
export function countInventoryAttention(
	lots: InventoryLotResponse[],
): InventoryAttentionCounts {
	return lots.reduce<InventoryAttentionCounts>(
		(counts, lot) => {
			const reason = getInventoryAttentionReason(lot);
			if (reason) counts[reason] += 1;
			return counts;
		},
		{ expired: 0, out_of_stock: 0, low_stock: 0 },
	);
}

/** Un lote requiere reposición si está vencido, agotado o bajo mínimo. */
export function needsReplenish(lot: InventoryLotResponse): boolean {
	return getInventoryAttentionReason(lot) !== null;
}
