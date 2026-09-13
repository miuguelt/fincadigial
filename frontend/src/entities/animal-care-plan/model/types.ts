export type CarePlanType =
	| "Sanitario"
	| "Reproductivo"
	| "Nutricional"
	| "Manejo General"
	| "Preventivo";

export type CarePlanStatus = "Borrador" | "Activo" | "Completado" | "Cancelado";

export type CarePlanFulfillmentKind =
	| "observation"
	| "control"
	| "vaccination"
	| "treatment";

export interface CarePlanAnimal {
	id: number;
	record: string;
	sex?: string;
	status?: string;
}

export interface CarePlanStage {
	id: number;
	plan_id: number;
	finca_id: number;
	stage_order: number;
	stage_name: string;
	start_date?: string | null;
	due_date?: string | null;
	completed: boolean;
	completed_at?: string | null;
	observation?: string | null;
	fulfilled_kind?: CarePlanFulfillmentKind | null;
	fulfilled_ref_id?: number | null;
}

export interface AnimalCarePlan {
	id: number;
	animal_id: number;
	finca_id: number;
	plan_type: CarePlanType;
	status: CarePlanStatus;
	name: string;
	description?: string | null;
	start_date: string;
	end_date: string;
	notes?: string | null;
	animal?: CarePlanAnimal | null;
	stages?: CarePlanStage[];
}

export interface AnimalCarePlanInput {
	animal_id: number;
	plan_type: CarePlanType;
	status: CarePlanStatus;
	name: string;
	description?: string;
	start_date: string;
	end_date: string;
	notes?: string;
}
