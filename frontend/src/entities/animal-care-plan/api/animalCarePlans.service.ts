import { BaseService } from "@/shared/api/base-service";
import type { PaginatedResponse } from "@/shared/api/generated/swaggerTypes";
import type {
	AnimalCarePlan,
	AnimalCarePlanInput,
	CarePlanStage,
} from "../model/types";

export class AnimalCarePlanService extends BaseService<AnimalCarePlan> {
	constructor() {
		super("animal-care-plans", {
			preferredListKeys: ["plans", "items"],
		});
	}

	getPlans(
		params: { page?: number; limit?: number; search?: string; status?: string } = {},
	): Promise<PaginatedResponse<AnimalCarePlan>> {
		return this.getPaginated(params);
	}

	createPlan(data: AnimalCarePlanInput): Promise<AnimalCarePlan> {
		return this.create(data);
	}

	updatePlan(
		id: number | string,
		data: Partial<AnimalCarePlanInput>,
	): Promise<AnimalCarePlan> {
		return this.update(id, data);
	}

	deletePlan(id: number | string): Promise<boolean> {
		return this.delete(id);
	}
}

export class AnimalCarePlanStageService extends BaseService<CarePlanStage> {
	constructor() {
		super("animal-care-plan-stages", {
			preferredListKeys: ["stages", "items"],
		});
	}

	getStages(
		params: { page?: number; limit?: number; plan_id?: number } = {},
	): Promise<PaginatedResponse<CarePlanStage>> {
		return this.getPaginated(params);
	}
}

export const animalCarePlanService = new AnimalCarePlanService();
export const animalCarePlanStageService = new AnimalCarePlanStageService();
