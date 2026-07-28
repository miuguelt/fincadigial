import { medicationsService } from "@/entities/medication/api/medications.service";
import { vaccinesService } from "@/entities/vaccine/api/vaccines.service";
import type {
	InventoryLotInput,
	InventoryLotResponse,
} from "@/shared/api/generated/swaggerTypes";
import type { CRUDFormSection } from "@/shared/types/crud";

export const initialInventoryFormData: InventoryLotInput = {
	product_type: "Medicamento",
	lot_number: "",
	quantity: 0,
	unit: "ml",
	expiry_date: new Date().toISOString().split("T")[0],
	min_stock: 5,
};

const toDateInput = (value: unknown): string => {
	if (!value) return "";
	return typeof value === "string" ? value.split("T")[0] : String(value);
};

export const mapResponseToForm = (
	item: InventoryLotResponse & { [k: string]: any },
): InventoryLotInput & { [k: string]: any } =>
	({
		id: item.id,
		product_type: item.product_type || "Medicamento",
		medication_id: item.medication_id,
		vaccine_id: item.vaccine_id,
		lot_number: item.lot_number || "",
		quantity: item.quantity ?? item.current_quantity ?? 0,
		unit: item.unit || "",
		expiry_date: toDateInput(item.expiry_date),
		min_stock: item.min_stock,
		supplier: item.supplier || "",
		unit_cost: item.unit_cost,
		entry_date: toDateInput(item.entry_date),
		notes: item.notes || "",
	}) as unknown as InventoryLotInput;

export const inventoryFormSections: CRUDFormSection<InventoryLotInput>[] = [
	{
		title: "Información del Producto",
		fields: [
			{
				name: "product_type",
				label: "Tipo de Producto",
				type: "select",
				required: true,
				options: [
					{ label: "Medicamento", value: "Medicamento" },
					{ label: "Vacuna", value: "Vacuna" },
				],
				// showIf sólo oculta el campo: sin esto el FK anterior viajaría en el
				// payload y el backend rechaza el lote por vínculo cruzado.
				onChange: (value: any) =>
					value === "Vacuna"
						? ({ medication_id: undefined } as Partial<InventoryLotInput>)
						: ({ vaccine_id: undefined } as Partial<InventoryLotInput>),
			},
			{
				name: "medication_id",
				label: "Medicamento",
				type: "select",
				dependsOn: "product_type",
				showIf: (data: InventoryLotInput) =>
					data.product_type === "Medicamento",
				required: true,
				helperText:
					"Vincular el producto habilita la búsqueda por nombre y la autonomía agrupada.",
				loadOptions: async () => {
					const meds = await medicationsService.getAll();
					return meds.map((m: any) => ({ label: m.name, value: m.id }));
				},
			},
			{
				name: "vaccine_id",
				label: "Vacuna",
				type: "select",
				dependsOn: "product_type",
				showIf: (data: InventoryLotInput) => data.product_type === "Vacuna",
				required: true,
				helperText:
					"Vincular el producto habilita la búsqueda por nombre y la autonomía agrupada.",
				loadOptions: async () => {
					const vacs = await vaccinesService.getAll();
					return vacs.map((v: any) => ({ label: v.name, value: v.id }));
				},
			},
		],
	},
	{
		title: "Detalles del Lote",
		fields: [
			{
				name: "lot_number",
				label: "Número de Lote",
				type: "text",
				required: true,
				placeholder: "Ej: AB-1234",
			},
			{
				name: "quantity",
				label: "Cantidad Inicial",
				type: "number",
				required: true,
				validation: { min: 0 },
			},
			{
				name: "unit",
				label: "Unidad de Medida",
				type: "text",
				required: true,
				placeholder: "ml, mg, dosis...",
			},
			{
				name: "expiry_date",
				label: "Fecha de Vencimiento",
				type: "date",
				required: true,
			},
			{
				name: "min_stock",
				label: "Stock Mínimo (Alerta)",
				type: "number",
				validation: { min: 0 },
			},
		],
	},
	{
		title: "Compra y Proveedor",
		fields: [
			{ name: "supplier", label: "Proveedor", type: "text" },
			{
				name: "unit_cost",
				label: "Costo Unitario",
				type: "number",
				validation: { min: 0 },
			},
			{ name: "entry_date", label: "Fecha de Ingreso", type: "date" },
			{ name: "notes", label: "Observaciones", type: "textarea" },
		],
	},
];
