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

/**
 * ¿Se le puede escribir a este usuario?
 *
 * `chatContactIds` viene de `/chat/contacts`, que es la regla real del backend
 * (misma finca activa + usuario habilitado). Cuando está disponible manda; si
 * aún no cargó se cae a la heurística local para no bloquear la interfaz.
 */
export const getChatAvailability = (
	target: UserWithProfile,
	currentUser?: any,
	chatContactIds?: Set<number> | null,
) => {
	if (!currentUser?.id || !target?.id) {
		return { enabled: false, reason: "Verificando disponibilidad del chat…" };
	}
	if (Number(target.id) === Number(currentUser.id)) {
		return { enabled: false, reason: "No puedes enviarte mensajes a ti mismo" };
	}

	const isActive =
		typeof target.status === "boolean" ? target.status : target.status === "1";
	if (!isActive) {
		return { enabled: false, reason: "Chat no disponible: usuario inactivo" };
	}

	if (chatContactIds) {
		return chatContactIds.has(Number(target.id))
			? { enabled: true, reason: `Escribir a ${target.fullname}` }
			: {
					enabled: false,
					reason: "Chat no disponible: no comparte una finca activa",
				};
	}

	return { enabled: false, reason: "Verificando disponibilidad del chat…" };
};

export const canMessageUser = (
	target: UserWithProfile,
	currentUser?: any,
	chatContactIds?: Set<number> | null,
) => getChatAvailability(target, currentUser, chatContactIds).enabled;
