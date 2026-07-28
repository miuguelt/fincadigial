import type { UserWithProfile } from "../types";

export const accessStatusMap = {
	Pending: {
		label: "Esperando",
		color: "bg-amber-500/10 text-amber-700 border-amber-500/25",
	},
	Approved: {
		label: "Permitido",
		color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
	},
	Rejected: {
		label: "Negado",
		color: "bg-rose-500/10 text-rose-700 border-rose-500/25",
	},
	Suspended: {
		label: "Suspendido",
		color: "bg-slate-500/10 text-slate-700 border-slate-500/25",
	},
} as const;

export const formatDate = (value?: string | null) =>
	value
		? new Date(value).toLocaleDateString("es-CO", {
				year: "numeric",
				month: "short",
				day: "2-digit",
			})
		: "-";

export const daysSince = (value?: string | null) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
};

export const getUserFincas = (user: UserWithProfile) => {
	const fincas = Array.isArray(user.fincas) ? user.fincas : [];
	if (fincas.length > 0) return fincas;
	if (!user.finca_id && !user.finca_name) return [];

	return [
		{
			id: user.finca_id,
			finca_id: user.finca_id,
			name: user.finca_name,
			finca_name: user.finca_name,
			type: user.finca_type,
			finca_type: user.finca_type,
			role: user.role,
			is_active: user.status,
			is_primary: true,
		},
	];
};

export const getAccessStatus = (status?: UserWithProfile["approval_status"]) =>
	status ? accessStatusMap[status] : undefined;

export const canMessageUser = (target: UserWithProfile, currentUser?: any) => {
	if (!currentUser?.id || !currentUser?.finca_id || !target?.id) return false;
	if (Number(target.id) === Number(currentUser.id)) return false;

	const isActive =
		typeof target.status === "boolean" ? target.status : target.status === "1";
	if (!isActive) return false;

	const activeFincaId = Number(currentUser.finca_id);
	return getUserFincas(target).some(
		(finca) =>
			Number(finca.finca_id ?? finca.id) === activeFincaId &&
			finca.is_active !== false,
	);
};
