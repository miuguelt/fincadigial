import { BaseService } from "@/shared/api/base-service";

export interface ManagementPlan {
	id: number;
	finca_id: number;
	name: string;
	description?: string;
	plan_type:
		| "Sanitario"
		| "Reproductivo"
		| "Nutricional"
		| "Manejo General"
		| "Educativo / Práctica";
	status: "Borrador" | "Activo" | "Completado" | "Cancelado";
	start_date: string;
	end_date: string;
	created_by_user: number;
	approved_by_user?: number;
	notes?: string;
	created_at?: string;
	updated_at?: string;
}

class ManagementPlanService extends BaseService<ManagementPlan> {
	constructor() {
		super("management-plans", {
			enableCache: true,
		});
	}
}

export const managementPlanService = new ManagementPlanService();
export default managementPlanService;
