import type { HealthStatus } from "@/shared/api/generated/swaggerTypes";

export type ControlEntryMode = "weight" | "health" | "full";

export interface ControlEntryFormValues {
	animal_id: number;
	checkup_date: string;
	weight?: number;
	height?: number;
	health_status: HealthStatus | "";
	description?: string;
}

export interface ControlEntryFormWidgetProps {
	onSuccess?: () => void;
	defaultDate?: string;
	onCancel?: () => void;
	mode?: ControlEntryMode;
}

export interface ControlEntryAnimal {
	id: number;
	record?: string;
	registro?: string;
	alias?: string;
	name?: string;
	nombre?: string;
}

export interface ControlEntryModeCopy {
	submitLabel: string;
	successMessage: string;
	errorMessage: string;
}
