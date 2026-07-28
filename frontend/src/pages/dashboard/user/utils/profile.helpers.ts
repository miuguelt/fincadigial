export const extractErrorMessage = (error: any): string => {
	const payload =
		error?.response?.data ?? error?.details ?? error?.data ?? error;
	const block = payload?.error ?? payload;
	const fromErrorsObject = (errors: any): string | undefined => {
		if (!errors) return undefined;
		if (Array.isArray(errors)) {
			const messages = errors
				.map((item) =>
					typeof item === "string"
						? item
						: item?.message || item?.detail || item,
				)
				.filter(Boolean);
			return messages.length ? messages.join(" ") : undefined;
		}
		if (typeof errors === "object") {
			const messages = Object.values(errors)
				.flatMap((item) => (Array.isArray(item) ? item : [item]))
				.map((item) =>
					typeof item === "string"
						? item
						: item?.message || item?.detail || item,
				)
				.filter(Boolean);
			return messages.length ? messages.join(" ") : undefined;
		}
		return undefined;
	};
	const errors =
		block?.errors ??
		block?.data?.errors ??
		block?.data?.data?.errors ??
		block?.details?.errors ??
		block?.details?.data?.errors ??
		block?.validation_errors ??
		block?.data?.validation_errors ??
		block?.data?.data?.validation_errors ??
		block?.details?.validation_errors ??
		block?.details?.data?.validation_errors ??
		payload?.errors ??
		payload?.details?.errors;
	return (
		fromErrorsObject(errors) ||
		block?.message ||
		block?.detail ||
		block?.error ||
		payload?.message ||
		payload?.detail ||
		error?.message ||
		"Ocurrió un error."
	);
};

export const toEpochMs = (value: any): number | null => {
	if (!value) return null;
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (value instanceof Date) {
		const t = value.getTime();
		return Number.isFinite(t) ? t : null;
	}
	const parsed = new Date(String(value)).getTime();
	return Number.isFinite(parsed) ? parsed : null;
};

export const getRolePrefix = (roleValue: string | undefined): string => {
	switch (roleValue) {
		case "Administrador":
		case "Propietario":
		case "Capataz":
			return "/admin";
		case "Instructor":
			return "/instructor";
		case "Veterinario":
			return "/veterinario";
		case "Aprendiz":
			return "/apprentice";
		case "Operario":
			return "/operario";
		default:
			return "/admin";
	}
};

export const getAnimalIdFromRecord = (record: any): number | null => {
	const candidates = [
		record?.animal_id,
		record?.animalId,
		record?.animals?.id,
		record?.animal?.id,
		record?.animals_id,
	];
	const candidate = candidates.find((value) => value != null && value !== "");
	const num = Number(candidate);
	return Number.isFinite(num) ? num : null;
};
