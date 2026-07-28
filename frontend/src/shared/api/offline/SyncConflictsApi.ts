import { devLogger } from "@/shared/utils/devLogger";
import api from "../client";

export interface SyncConflict {
	id: number;
	operation_id: string;
	entity_type: string;
	entity_id?: string;
	local_payload?: any;
	incoming_payload?: any;
	resolution?: string;
	resolved_by?: number;
	resolved_at?: string;
	created_at: string;
}

export class SyncConflictsApi {
	/** Obtiene la lista de conflictos activos sin resolver */
	static async getActiveConflicts(fincaId: number): Promise<SyncConflict[]> {
		try {
			const response = await api.get("/api/v1/sync/conflicts", {
				params: { finca_id: fincaId },
			});
			return response.data?.conflicts || [];
		} catch (err) {
			devLogger.error("Error fetching conflicts:", err);
			return [];
		}
	}

	/** Resuelve un conflicto */
	static async resolveConflict(
		fincaId: number,
		conflictId: number,
		resolution: "server" | "local" | "reject" | "accept",
	): Promise<boolean> {
		try {
			await api.post("/api/v1/sync/resolve-conflict", {
				finca_id: fincaId,
				conflict_id: conflictId,
				resolution,
			});
			return true;
		} catch (err) {
			devLogger.error("Error resolving conflict:", err);
			return false;
		}
	}
}
