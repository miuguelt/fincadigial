import api from "@/shared/api/client";
import type { PaginatedResponse } from "@/shared/api/generated/swaggerTypes";

export interface AnimalMovementInput {
	animal_id: number;
	tipo_movimiento:
		| "Traslado_Interno"
		| "Venta_Traslado_Externo"
		| "Venta_En_Predio";
	fecha_movimiento: string; // YYYY-MM-DD
	finca_destino_id?: number;
	finca_destino_externa?: string;
	rpp_destino_externo?: string;
	precio_venta?: number;
	comprador?: string;
	comprador_nit?: string;
	arete_sinigan?: string;
	guia_movilizacion?: string;
	ruv_vacunacion?: string;
	placa_vehiculo?: string;
	nombre_conductor?: string;
	cedula_conductor?: string;
	precinto_seguridad?: string;
	notes?: string;
}

export interface AnimalMovementResponse {
	id: number;
	animal_id: number;
	finca_origen_id: number;
	finca_destino_id?: number;
	finca_destino_externa?: string;
	rpp_destino_externo?: string;
	tipo_movimiento:
		| "Traslado_Interno"
		| "Venta_Traslado_Externo"
		| "Venta_En_Predio";
	fecha_movimiento: string;
	precio_venta?: number;
	comprador?: string;
	comprador_nit?: string;
	arete_sinigan?: string;
	guia_movilizacion?: string;
	ruv_vacunacion?: string;
	placa_vehiculo?: string;
	nombre_conductor?: string;
	cedula_conductor?: string;
	precinto_seguridad?: string;
	notes?: string;
	created_at?: string;
	updated_at?: string;
	animal?: {
		id: number;
		record: string;
		sex: string;
	};
	finca_origen?: {
		id: number;
		name: string;
	};
	finca_destino?: {
		id: number;
		name: string;
	};
}

class AnimalMovementsService {
	/**
	 * Register a new animal movement (sale/transfer)
	 */
	async registerMovement(
		payload: AnimalMovementInput,
	): Promise<AnimalMovementResponse> {
		const response = await api.post<AnimalMovementResponse>(
			"/animals/movements",
			payload,
		);
		return response.data;
	}

	/**
	 * Get all movements associated with the active finca
	 */
	async getMovements(
		params?: Record<string, any>,
	): Promise<PaginatedResponse<AnimalMovementResponse>> {
		const response = await api.get<PaginatedResponse<AnimalMovementResponse>>(
			"/animals/movements",
			{ params },
		);
		return response.data;
	}

	/**
	 * Get movement history for a specific animal
	 */
	async getAnimalMovements(
		animalId: number,
	): Promise<AnimalMovementResponse[]> {
		const response = await api.get<AnimalMovementResponse[]>(
			`/animals/movements/animal/${animalId}`,
		);
		return response.data;
	}
}

export const animalMovementsService = new AnimalMovementsService();
