import type {
	AnimalInput,
	AnimalResponse,
} from "@/shared/api/generated/swaggerTypes";
import { getTodayColombia } from "@/shared/utils/dateUtils";

export function normalizeSex(value: any): "Macho" | "Hembra" | undefined {
	if (!value && value !== 0) return undefined;
	const s = String(value).trim().toLowerCase();
	if (s === "m" || s === "male" || s === "macho" || s === "1" || s === "01")
		return "Macho";
	if (s === "f" || s === "female" || s === "hembra" || s === "2" || s === "02")
		return "Hembra";
	if (s === "macho") return "Macho";
	if (s === "hembra") return "Hembra";
	return undefined;
}

export function isDateLike(term: any): boolean {
	if (term === null || term === undefined) return false;
	const s = String(term).trim();
	if (!s) return false;
	if (/^\d{4}$/.test(s)) return true;
	if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) return true;
	if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s)) return true;
	return false;
}

export function enrichParamsForDateSearch(
	params: Record<string, any> = {},
): Record<string, any> {
	const searchTerm = params.search ?? params.q;
	if (!isDateLike(searchTerm)) return params;

	const extraDateFields = ["birth_date", "created_at", "updated_at"];
	const existingFields = (params.fields ? String(params.fields) : "")
		.split(",")
		.map((f) => f.trim())
		.filter(Boolean);
	const merged = Array.from(new Set([...existingFields, ...extraDateFields]));

	return {
		...params,
		search: searchTerm,
		q: searchTerm,
		fields: merged.join(","),
	};
}

export function normalizeStatus(value: any): string | undefined {
	if (value === null || value === undefined) return undefined;
	const s = String(value).trim().toLowerCase();
	if (s === "vivo" || s === "activo" || s === "alive") return "Activo";
	if (s === "muerto" || s === "dead" || s === "fallecido") return "Muerto";
	if (s === "vendido" || s === "sold") return "Vendido";
	if (s === "inactivo" || s === "inactive") return "Inactivo";
	return value as string;
}

export function mapStatusToBackend(
	value: any,
): "Vivo" | "Muerto" | "Vendido" | undefined {
	if (value === null || value === undefined) return undefined;
	const s = String(value).trim().toLowerCase();
	if (s === "vivo" || s === "activo" || s === "alive") return "Vivo";
	if (s === "muerto" || s === "dead" || s === "fallecido") return "Muerto";
	if (s === "vendido" || s === "sold") return "Vendido";
	return undefined;
}

export function parseDate(value: any): string | undefined {
	if (!value) return undefined;
	if (typeof value === "string" && value.trim()) return value.trim();
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	const v = (value as any)?.$d;
	if (v instanceof Date) return v.toISOString().slice(0, 10);
	return undefined;
}

export function computeAgeDays(birth_date?: string): number | undefined {
	if (!birth_date) return undefined;
	const bd = new Date(birth_date);
	if (isNaN(bd.getTime())) return undefined;
	const now = new Date();
	const diffMs = now.getTime() - bd.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function buildApiPayload(
	data: Partial<AnimalInput> & { [k: string]: any },
	isPatch = false,
): Record<string, any> {
	if (isPatch) {
		const payload: Record<string, any> = {};

		if ("record" in data || "code" in data || "registro" in data) {
			payload.record =
				data.record ?? (data as any).code ?? (data as any).registro;
		}
		if (
			"birth_date" in data ||
			"birthDate" in data ||
			"fecha_nacimiento" in data
		) {
			payload.birth_date = parseDate(
				data.birth_date ??
					(data as any).birthDate ??
					(data as any).fecha_nacimiento,
			);
		}
		if ("weight" in data || "peso" in data) {
			payload.weight = data.weight ?? (data as any).peso;
		}
		if (
			"breed_id" in data ||
			"breeds_id" in data ||
			"raza_id" in data ||
			"breedId" in data
		) {
			payload.breeds_id =
				data.breed_id ??
				(data as any).breeds_id ??
				(data as any).raza_id ??
				(data as any).breedId;
		}
		if (
			"gender" in data ||
			"sex" in data ||
			"sexo" in data ||
			"genero" in data
		) {
			payload.sex = normalizeSex(
				data.gender ??
					(data as any).sex ??
					(data as any).sexo ??
					(data as any).genero,
			);
		}
		if ("status" in data || "estado" in data) {
			payload.status = mapStatusToBackend(data.status ?? (data as any).estado);
		}
		if (
			"father_id" in data ||
			"idFather" in data ||
			"padre_id" in data ||
			"fatherId" in data
		) {
			payload.idFather =
				data.father_id ??
				data.idFather ??
				(data as any).padre_id ??
				(data as any).fatherId;
		}
		if (
			"mother_id" in data ||
			"idMother" in data ||
			"madre_id" in data ||
			"motherId" in data
		) {
			payload.idMother =
				data.mother_id ??
				data.idMother ??
				(data as any).madre_id ??
				(data as any).motherId;
		}
		if ("notes" in data || "observations" in data || "observaciones" in data) {
			payload.notes =
				data.notes ?? (data as any).observations ?? (data as any).observaciones;
		}
		if ("entry_date" in data) payload.entry_date = parseDate(data.entry_date);
		if ("purchase_date" in data)
			payload.purchase_date = parseDate(data.purchase_date);
		if ("sale_date" in data) payload.sale_date = parseDate(data.sale_date);
		if ("exit_date" in data) payload.exit_date = parseDate(data.exit_date);
		if ("exit_reason" in data) payload.exit_reason = data.exit_reason;

		Object.keys(payload).forEach((k) => {
			if (payload[k] === undefined) delete payload[k];
		});

		const todayStr = getTodayColombia();
		const dateFieldsToCheck = [
			"birth_date",
			"entry_date",
			"purchase_date",
			"exit_date",
			"sale_date",
		];
		for (const fieldKey of dateFieldsToCheck) {
			const dateVal = payload[fieldKey];
			if (dateVal && typeof dateVal === "string" && dateVal > todayStr) {
				const fieldLabel =
					fieldKey === "birth_date"
						? "fecha de nacimiento"
						: fieldKey.replace("_", " ");
				throw new Error(`La ${fieldLabel} no puede ser futura`);
			}
		}

		return payload;
	}

	const birthDate = parseDate(data.birth_date ?? (data as any).birthDate);
	const sex = normalizeSex(
		data.gender ?? (data as any).sex ?? (data as any).sexo,
	);
	const breedsId =
		data.breed_id ??
		(data as any).breeds_id ??
		(data as any).raza_id ??
		(data as any).breedId;
	const status = mapStatusToBackend(data.status ?? (data as any).estado);

	if (!sex) {
		throw new Error(
			'El campo "gender/sex" es requerido y no puede estar vacío',
		);
	}
	if (!breedsId || breedsId <= 0) {
		throw new Error(
			'El campo "breed_id/breeds_id" es requerido y debe ser mayor a 0',
		);
	}
	if (data.weight === undefined || data.weight === null) {
		throw new Error('El campo "weight" es requerido');
	}

	const payload: Record<string, any> = {
		record: data.record ?? (data as any).code ?? (data as any).registro,
		birth_date: birthDate,
		weight: data.weight,
		breeds_id: breedsId,
		sex,
		status,
		idFather: data.father_id ?? data.idFather,
		idMother: data.mother_id ?? data.idMother,
		notes:
			data.notes ?? (data as any).observations ?? (data as any).observaciones,
		entry_date: parseDate(data.entry_date),
		purchase_date: parseDate(data.purchase_date),
		sale_date: parseDate(data.sale_date),
		exit_date: parseDate(data.exit_date),
		exit_reason: data.exit_reason,
	};

	Object.keys(payload).forEach((k) => {
		const v = (payload as any)[k];
		if (v === undefined || v === null || (typeof v === "string" && !v.trim())) {
			delete (payload as any)[k];
		} else if (k === "breeds_id" && typeof v === "number" && v <= 0) {
			delete (payload as any)[k];
		} else if ((k === "idFather" || k === "idMother") && v === 0) {
			delete (payload as any)[k];
		}
	});

	const todayStr = getTodayColombia();
	const dateFieldsToCheck = [
		"birth_date",
		"entry_date",
		"purchase_date",
		"exit_date",
		"sale_date",
	];
	for (const fieldKey of dateFieldsToCheck) {
		const dateVal = payload[fieldKey];
		if (dateVal && typeof dateVal === "string" && dateVal > todayStr) {
			const fieldLabel =
				fieldKey === "birth_date"
					? "fecha de nacimiento"
					: fieldKey.replace("_", " ");
			throw new Error(`La ${fieldLabel} no puede ser futura`);
		}
	}

	return payload;
}

export function normalizeAnimal(
	item: any,
): AnimalResponse & { [k: string]: any } {
	const birth_date = parseDate(item?.birth_date ?? item?.birthDate);
	const age_in_days = item?.age_in_days ?? computeAgeDays(birth_date);
	const age_in_months =
		item?.age_in_months ??
		(typeof age_in_days === "number"
			? Math.floor(age_in_days / 30)
			: undefined);
	const gender = normalizeSex(
		item?.gender ?? item?.sex ?? item?.sexo ?? item?.genero,
	);

	const breedsId = item?.breeds_id;
	const breedId = item?.breed_id ?? item?.breedId ?? item?.raza_id;

	return {
		...item,
		id: item?.id ?? item?.idAnimal ?? item?.animal_id,
		record: item?.record ?? item?.code ?? item?.registro ?? "",
		name: item?.name ?? item?.nombre,
		birth_date,
		weight: item?.weight ?? item?.peso,
		created_at: item?.created_at ?? item?.createdAt,
		breed_id: breedsId ?? breedId,
		breeds_id: breedsId ?? breedId,
		gender,
		sex: gender,
		status: normalizeStatus(item?.status ?? item?.estado),
		idFather: item?.idFather ?? item?.father_id ?? item?.padre_id,
		idMother: item?.idMother ?? item?.mother_id ?? item?.madre_id,
		father_id: item?.idFather ?? item?.father_id ?? item?.padre_id,
		mother_id: item?.idMother ?? item?.mother_id ?? item?.madre_id,
		notes: item?.notes ?? item?.observations ?? item?.observaciones,
		entry_date: parseDate(item?.entry_date),
		purchase_date: parseDate(item?.purchase_date),
		sale_date: parseDate(item?.sale_date),
		exit_date: parseDate(item?.exit_date),
		exit_reason: item?.exit_reason,
		age_in_days,
		age_in_months,
		is_adult:
			item?.is_adult ??
			(typeof age_in_months === "number" ? age_in_months >= 12 : undefined),
	} as any;
}
