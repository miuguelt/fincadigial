import type {
	CorralSessionPayload,
	HealthSelection,
	ReproductionEvent,
} from "./types";
import { getNowColombiaISO } from "@/shared/utils/dateUtils";

interface CorralFormValues {
	animalId: number;
	fincaId?: number;
	healthStatus: HealthSelection;
	weight: string;
	milkLiters: string;
	isFemale: boolean;
	showRepro: boolean;
	reproEvent: ReproductionEvent;
	showTransfer: boolean;
	targetFieldId: number | "";
	showTreatment: boolean;
	treatmentDesc: string;
	treatmentDosis: string;
	treatmentFrequency: string;
}

interface PayloadError {
	title: string;
	description: string;
}

type PayloadResult =
	| { payload: CorralSessionPayload; error?: never }
	| { payload?: never; error: PayloadError };

export function buildCorralPayload(values: CorralFormValues): PayloadResult {
	if (values.healthStatus === "") {
		return {
			error: {
				title: "Falta revisar la salud",
				description: "Indique cómo ve al animal antes de guardar.",
			},
		};
	}
	if (values.isFemale && values.showRepro && !values.reproEvent) {
		return {
			error: {
				title: "Falta escoger la novedad",
				description: "Indique si fue celo, inseminación, diagnóstico o parto.",
			},
		};
	}
	if (values.showTransfer && values.targetFieldId === "") {
		return {
			error: {
				title: "Falta escoger el potrero",
				description: "Seleccione el potrero de destino o quite el traslado.",
			},
		};
	}

	const treatmentStarted = Boolean(
		values.treatmentDesc.trim() ||
			values.treatmentDosis.trim() ||
			values.treatmentFrequency.trim(),
	);
	if (
		values.showTreatment &&
		treatmentStarted &&
		(!values.treatmentDesc.trim() ||
			!values.treatmentDosis.trim() ||
			!values.treatmentFrequency.trim())
	) {
		return {
			error: {
				title: "Faltan datos del remedio",
				description: "Complete el nombre, la dosis y cada cuánto se aplicó.",
			},
		};
	}

	const payload: CorralSessionPayload = {
		animal_id: values.animalId,
		finca_id: values.fincaId,
		health_status: values.healthStatus,
	};
	if (values.weight) payload.weight = Number.parseFloat(values.weight);
	if (
		values.isFemale &&
		values.milkLiters &&
		Number.parseFloat(values.milkLiters) > 0
	) {
		payload.milk_liters = Number.parseFloat(values.milkLiters);
		const colombiaHour = Number.parseInt(
			getNowColombiaISO().slice(11, 13),
			10,
		);
		payload.milking_session = colombiaHour < 12 ? "AM" : "PM";
	}
	if (values.isFemale && values.showRepro && values.reproEvent) {
		payload.reproduction_event = values.reproEvent;
	}
	if (values.showTreatment && treatmentStarted) {
		payload.treatment_description = values.treatmentDesc;
		payload.treatment_dosis = values.treatmentDosis;
		payload.treatment_frequency = values.treatmentFrequency;
	}
	return { payload };
}
