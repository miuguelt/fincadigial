import { useMemo } from "react";
import { getAnimalLabel } from "@/entities/animal/lib/animalHelpers";
import { getAnimalIdFromRecord } from "./profile.helpers";

export const useUserData = ({
	user,
	animals,
	genetics,
	animalFields,
	animalDiseases,
	treatments,
	vaccinations,
	controls,
}: {
	user: any;
	animals: any[];
	genetics: any[];
	animalFields: any[];
	animalDiseases: any[];
	treatments: any[];
	vaccinations: any[];
	controls: any[];
}) => {
	return useMemo(() => {
		const userIdentity = String(user?.identification ?? user?.id ?? "");
		const userId = Number(user?.id ?? 0);
		const safeAnimals = Array.isArray(animals) ? animals : [];
		const safeGenetics = Array.isArray(genetics) ? genetics : [];
		const safeAnimalFields = Array.isArray(animalFields) ? animalFields : [];
		const safeAnimalDiseases = Array.isArray(animalDiseases)
			? animalDiseases
			: [];
		const safeTreatments = Array.isArray(treatments) ? treatments : [];
		const safeVaccinations = Array.isArray(vaccinations) ? vaccinations : [];
		const safeControls = Array.isArray(controls) ? controls : [];

		const userAnimalRecords = safeAnimals.filter((animal: any) => {
			const nestedId = animal?.user?.id;
			const nestedIdentification = animal?.user?.identification;
			const directId = animal?.user_id ?? animal?.userId;
			if (nestedId != null && Number(nestedId) === userId) return true;
			if (directId != null && Number(directId) === userId) return true;
			return String(nestedIdentification ?? "") === userIdentity;
		});

		const userAnimalIds = new Set(
			userAnimalRecords
				.map((animal: any) => Number(animal?.id))
				.filter((id: number) => Number.isFinite(id) && id > 0),
		);

		const animalLabelById = new Map(
			userAnimalRecords.map((animal: any) => [
				Number(animal?.id),
				getAnimalLabel(animal) || animal.code || animal.record || "-",
			]),
		);

		const isUserFkRecord = (record: any): boolean => {
			if (!record) return false;
			const animalId = getAnimalIdFromRecord(record);
			if (animalId != null && userAnimalIds.has(animalId)) return true;

			const directIdCandidates = [
				record?.user_id,
				record?.userId,
				record?.apprentice_id,
				record?.apprenticeId,
				record?.instructor_id,
				record?.instructorId,
				record?.owner_id,
				record?.ownerId,
			];
			if (
				userId &&
				directIdCandidates.some((value) => Number(value) === userId)
			)
				return true;

			const nestedUsers = [
				record?.user,
				record?.apprentice,
				record?.instructor,
				record?.owner,
			].filter(Boolean);

			for (const nested of nestedUsers) {
				if (nested?.id != null && Number(nested.id) === userId) return true;
				if (
					nested?.identification != null &&
					String(nested.identification) === userIdentity
				)
					return true;
			}
			return false;
		};

		const userAnimals = userAnimalRecords.map((animal: any) => ({
			id: animal.id,
			animal: getAnimalLabel(animal) || "Sin registro",
			code: animal.code || animal.record || "-",
			specie: animal.specie?.name || animal.species?.name || "-",
			breed: animal.breed?.name || "-",
			status: animal.status || "-",
			ts: animal?.updated_at || animal?.created_at || null,
		}));

		const userGenetics = safeGenetics
			.filter(isUserFkRecord)
			.map((genetic: any) => ({
				id: genetic?.id,
				animal:
					getAnimalLabel(genetic?.animal) ||
					genetic?.animal?.code ||
					genetic?.animal?.record ||
					"-",
				type:
					genetic?.type ||
					genetic?.genetic_event_technique ||
					genetic?.genetic_event_techique ||
					"-",
				date: genetic?.date ? new Date(genetic.date).toLocaleDateString('es-CO') : "-",
				description: genetic?.description || genetic?.details || "-",
				animalId: getAnimalIdFromRecord(genetic),
				ts: genetic?.date || genetic?.updated_at || genetic?.created_at || null,
			}));

		const userAnimalFields = safeAnimalFields
			.filter(isUserFkRecord)
			.map((field: any) => ({
				id: field?.id,
				animal:
					getAnimalLabel(field?.animal) ||
					field?.animal?.code ||
					field?.animal?.record ||
					"-",
				field: field?.field?.name || "-",
				entryDate: field?.entry_date
					? new Date(field.entry_date).toLocaleDateString('es-CO')
					: "-",
				exitDate: field?.exit_date
					? new Date(field.exit_date).toLocaleDateString('es-CO')
					: "-",
				animalId: getAnimalIdFromRecord(field),
				ts:
					field?.exit_date ||
					field?.entry_date ||
					field?.updated_at ||
					field?.created_at ||
					null,
			}));

		const userAnimalDiseases = safeAnimalDiseases
			.filter(isUserFkRecord)
			.map((d: any) => ({
				id: d?.id,
				animal:
					d?.animal_record ||
					animalLabelById.get(getAnimalIdFromRecord(d) ?? -1) ||
					"-",
				disease:
					d?.disease_name || d?.diseases?.name || d?.disease?.name || "-",
				status: d?.status || "-",
				date: d?.diagnosis_date
					? new Date(d.diagnosis_date).toLocaleDateString('es-CO')
					: "-",
				animalId: getAnimalIdFromRecord(d),
				ts: d?.diagnosis_date || d?.updated_at || d?.created_at || null,
			}));

		const userTreatments = safeTreatments
			.filter(isUserFkRecord)
			.map((t: any) => ({
				id: t?.id,
				animal:
					animalLabelById.get(getAnimalIdFromRecord(t) ?? -1) ||
					t?.animals?.record ||
					"-",
				date: t?.treatment_date
					? new Date(t.treatment_date).toLocaleDateString('es-CO')
					: "-",
				description: t?.description || t?.diagnosis || "-",
				frequency: t?.frequency || "-",
				animalId: getAnimalIdFromRecord(t),
				endDateRaw: t?.end_date || null,
				ts: t?.treatment_date || t?.updated_at || t?.created_at || null,
			}));

		const userVaccinations = safeVaccinations
			.filter(isUserFkRecord)
			.map((v: any) => ({
				id: v?.id,
				animal:
					animalLabelById.get(getAnimalIdFromRecord(v) ?? -1) ||
					v?.animals?.record ||
					"-",
				vaccine: v?.vaccines?.name || v?.vaccine?.name || v?.vaccine_id || "-",
				date: v?.application_date
					? new Date(v.application_date).toLocaleDateString('es-CO')
					: "-",
				responsible: v?.instructor_id || v?.apprentice_id || "-",
				animalId: getAnimalIdFromRecord(v),
				nextDateRaw:
					v?.next_dose_date ||
					v?.next_vaccination_date ||
					v?.next_due_date ||
					v?.expiry_date ||
					null,
				ts: v?.application_date || v?.updated_at || v?.created_at || null,
			}));

		const userControls = safeControls.filter(isUserFkRecord).map((c: any) => ({
			id: c?.id,
			animal:
				animalLabelById.get(getAnimalIdFromRecord(c) ?? -1) ||
				c?.animals?.record ||
				"-",
			date: c?.checkup_date
				? new Date(c.checkup_date).toLocaleDateString('es-CO')
				: "-",
			status: c?.health_status || c?.healt_status || "-",
			animalId: getAnimalIdFromRecord(c),
			nextDateRaw: c?.next_control_date || c?.next_checkup_date || null,
			ts: c?.checkup_date || c?.updated_at || c?.created_at || null,
		}));

		return {
			userAnimals,
			userGenetics,
			userAnimalFields,
			userAnimalDiseases,
			userTreatments,
			userVaccinations,
			userControls,
		};
	}, [
		user,
		animals,
		genetics,
		animalFields,
		animalDiseases,
		treatments,
		vaccinations,
		controls,
	]);
};
