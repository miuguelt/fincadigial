export type RecordType =
	| "all"
	| "milking"
	| "transfer"
	| "disease"
	| "treatment";

export interface UnifiedRecord {
	id: string;
	type: "milking" | "transfer" | "disease" | "treatment";
	date: string;
	animalId: number;
	animalLabel: string;
	entityId?: number; // ID de entidad relacionada (potrero, enfermedad, medicamento)
	entityLabel?: string; // Etiqueta de entidad relacionada
	details: string;
	notes?: string;
	raw: any;
}
