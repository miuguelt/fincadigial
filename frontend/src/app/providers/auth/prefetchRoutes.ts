import { Role } from "@/entities/user/model/types";

const isTestEnv =
	typeof (globalThis as any).process !== "undefined" &&
	(!!((globalThis as any).process as any).env?.JEST_WORKER_ID ||
		!!((globalThis as any).process as any).env?.VITEST);

export function prefetchRoleRoutes(role?: string | Role | null) {
	if (isTestEnv) return;
	try {
		void import("@/widgets/dashboard-layout/DashboardLayout.tsx");
		switch (role) {
			case Role.Administrador:
			case "Admin":
			case "Administrador":
				void import("@/pages/dashboard/admin/AdminDashboard.tsx");
				break;
			case Role.Instructor:
			case "Instructor":
				void import("@/pages/dashboard/instructor/InstructorDashboard.tsx");
				break;
			case Role.Aprendiz:
			case "Apprentice":
			case "Aprendiz":
				void import("@/pages/dashboard/apprentice/ApprenticeDashboard.tsx");
				break;
			default:
				void import("@/pages/landing/index");
				void import("@/pages/auth/login/index.tsx");
				break;
		}
	} catch {
		/* ignore prefetch failures */
	}
}
