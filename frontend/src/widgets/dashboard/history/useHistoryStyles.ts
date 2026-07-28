import { getStatusBadgeClass } from "@/shared/utils/badgeStyles";
import { getDueInfo } from "./useAnimalHistoryData";

export function useHistoryStyles() {
	const getEventTypeClasses = (
		type: "disease" | "treatment" | "control" | "movement",
	) => {
		switch (type) {
			case "disease":
				return getStatusBadgeClass("danger");
			case "control":
				return getStatusBadgeClass("success");
			case "movement":
				return getStatusBadgeClass("warning");
			case "treatment":
			default:
				return getStatusBadgeClass("info");
		}
	};

	const getStatusBadgeClasses = (status?: string) => {
		if (!status) return getStatusBadgeClass("neutral");
		const s = String(status).toLowerCase();
		if (
			["activo", "active", "pendiente", "in-progress"].some((k) =>
				s.includes(k),
			)
		)
			return getStatusBadgeClass("warning");
		if (
			["complet", "resuelto", "recovered", "ok", "normal"].some((k) =>
				s.includes(k),
			)
		)
			return getStatusBadgeClass("success");
		if (["grave", "crit", "bad", "malo"].some((k) => s.includes(k)))
			return getStatusBadgeClass("danger");
		return getStatusBadgeClass("neutral");
	};

	const getDueBadgeClasses = (dueStatus: "due_soon" | "overdue") =>
		dueStatus === "overdue"
			? getStatusBadgeClass("danger")
			: getStatusBadgeClass("warning");

	const getDueRingClasses = (dueStatus?: "due_soon" | "overdue" | "ok") => {
		if (dueStatus === "overdue") return "ring-2 ring-danger-400";
		if (dueStatus === "due_soon") return "ring-2 ring-warning-400";
		return "";
	};

	return {
		getEventTypeClasses,
		getStatusBadgeClasses,
		getDueBadgeClasses,
		getDueRingClasses,
		getDueInfo,
	};
}
