export type HealthStatus = "Excelente" | "Sano" | "Regular" | "Malo";

export type HealthSelection = HealthStatus | "";

export type ReproductionEvent =
	| ""
	| "Celo"
	| "Inseminacion"
	| "Diagnostico"
	| "Parto";

export interface AnimalOption {
	label: string;
	value: number;
	sex: "Macho" | "Hembra" | "Desconocido";
}

export interface FieldOption {
	label: string;
	value: number;
}

export interface CorralSessionPayload {
	animal_id: number;
	finca_id?: number;
	weight?: number;
	health_status: HealthStatus;
	milk_liters?: number;
	milking_session?: "AM" | "PM";
	reproduction_event?: ReproductionEvent;
	treatment_description?: string;
	treatment_dosis?: string;
	treatment_frequency?: string;
}

export interface CorralHistoryItem {
	id: number;
	animal_name: string;
	date: string;
	created_at: string;
	health_status?: HealthStatus;
	weight?: number;
	milk_liters?: number;
	reproduction_event?: string;
	treatment?: string;
}

export interface CorralPanelProps {
	onClose?: () => void;
}
