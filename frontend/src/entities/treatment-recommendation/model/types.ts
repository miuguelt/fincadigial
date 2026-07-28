export type RecommendationStatus = "en_curso" | "completado" | "suspendido";

export interface RecommendationAnimal {
	id: number;
	record: string;
	sex?: string;
	status?: string;
}

export interface TreatmentRecommendationControl {
	id: number;
	treatment_recommendation_id: number;
	scheduled_date: string;
	control_date?: string | null;
	observation?: string | null;
	completed: boolean;
	recorded_by?: number | null;
	recorder?: { id: number; fullname?: string; role?: string } | null;
}

export interface TreatmentRecommendation {
	id: number;
	animal_id: number;
	finca_id: number;
	title: string;
	recommendation: string;
	responsible?: string | null;
	start_date: string;
	estimated_end_date: string;
	duration_days: number;
	control_interval_days: number;
	status: RecommendationStatus;
	final_notes?: string | null;
	animal?: RecommendationAnimal | null;
	controls?: TreatmentRecommendationControl[];
	next_control?: TreatmentRecommendationControl | null;
}

export interface TreatmentRecommendationInput {
	animal_id: number;
	title: string;
	recommendation: string;
	responsible?: string;
	start_date: string;
	estimated_end_date?: string;
	duration_days?: number;
	control_interval_days: number;
	status?: RecommendationStatus;
	final_notes?: string;
}

export interface TreatmentRecommendationControlUpdate {
	completed: boolean;
	control_date?: string | null;
	observation?: string;
}
