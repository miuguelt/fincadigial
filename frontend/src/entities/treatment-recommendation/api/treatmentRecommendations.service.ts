import { BaseService } from "@/shared/api/base-service";
import type { PaginatedResponse } from "@/shared/api/generated/swaggerTypes";
import type {
	TreatmentRecommendation,
	TreatmentRecommendationControl,
	TreatmentRecommendationControlUpdate,
	TreatmentRecommendationInput,
} from "../model/types";

export class TreatmentRecommendationsService extends BaseService<TreatmentRecommendation> {
	constructor() {
		super("treatment-recommendations", {
			preferredListKeys: ["recommendations", "items"],
		});
	}

	getRecommendations(
		params: {
			page?: number;
			limit?: number;
			search?: string;
			status?: string;
		} = {},
	): Promise<PaginatedResponse<TreatmentRecommendation>> {
		return this.getPaginated(params);
	}

	createRecommendation(
		data: TreatmentRecommendationInput,
	): Promise<TreatmentRecommendation> {
		return this.create(data);
	}

	updateRecommendation(
		id: number | string,
		data: Partial<TreatmentRecommendationInput>,
	): Promise<TreatmentRecommendation> {
		return this.update(id, data);
	}

	deleteRecommendation(id: number | string): Promise<boolean> {
		return this.delete(id);
	}

	getControls(id: number | string): Promise<TreatmentRecommendationControl[]> {
		return this.customRequest(`${id}/controls`, "GET");
	}

	async updateControl(
		recommendationId: number | string,
		controlId: number | string,
		data: TreatmentRecommendationControlUpdate,
	): Promise<TreatmentRecommendationControl> {
		const control = await this.customRequest<TreatmentRecommendationControl>(
			`${recommendationId}/controls/${controlId}`,
			"PUT",
			data,
		);
		await this.clearCache();
		return control;
	}
}

export const treatmentRecommendationsService =
	new TreatmentRecommendationsService();
