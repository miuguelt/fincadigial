import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalImageService } from "@/entities/animal/api/animalImage.service";
import { animalDiseasesService } from "@/entities/animal-disease/api/animalDiseases.service";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { controlService } from "@/entities/control/api/control.service";
import { diseaseService } from "@/entities/disease/api/disease.service";
import { fieldService } from "@/entities/field/api/field.service";
import { geneticImprovementsService } from "@/entities/genetic-improvement/api/geneticImprovements.service";
import { treatmentsService } from "@/entities/treatment/api/treatments.service";
import { usersService } from "@/entities/user/api/user.service";
import { vaccinationsService } from "@/entities/vaccination/api/vaccinations.service";
import { vaccinesService } from "@/entities/vaccine/api/vaccines.service";
import {
	checkTreatmentDependencies,
	clearAnimalDependencyCache,
} from "@/features/diagnostics/api/dependencyCheck.service";
import { devLogger } from "@/shared/utils/devLogger";
import { resolveRecordId } from "@/shared/utils/recordIdUtils";

export type ActionModalEntityType =
	| "genetic_improvement"
	| "animal_disease"
	| "animal_field"
	| "vaccination"
	| "treatment"
	| "control"
	| "milk_production"
	| null;

export interface AnimalRelatedDataResult {
	geneticImprovements: any[];
	diseases: any[];
	fields: any[];
	vaccinations: any[];
	treatments: any[];
	controls: any[];
	animalImages: any[];
	loading: boolean;
	imagesLoading: boolean;
	hasRecentTreatments: boolean | null;
	isManualRefreshing: boolean;
	diseaseOptions: Record<number, string>;
	fieldOptions: Record<number, string>;
	vaccineOptions: Record<number, string>;
	userOptions: Record<number, string>;
	deletingItemId: string | number | null;
	confirmingDeleteId: string | number | null;
	setDeletingItemId: (id: string | number | null) => void;
	setConfirmingDeleteId: (id: string | number | null) => void;
	setGeneticImprovements: React.Dispatch<React.SetStateAction<any[]>>;
	setDiseases: React.Dispatch<React.SetStateAction<any[]>>;
	setFields: React.Dispatch<React.SetStateAction<any[]>>;
	setVaccinations: React.Dispatch<React.SetStateAction<any[]>>;
	setTreatments: React.Dispatch<React.SetStateAction<any[]>>;
	setControls: React.Dispatch<React.SetStateAction<any[]>>;
	handleRefresh: (type?: string) => void;
	handleDeleteRecord: (type: string | null, item: any) => Promise<void>;
	setIsManualRefreshing: (v: boolean) => void;
	triggerGlobalRefresh: () => void;
}

export function useAnimalRelatedData(
	animalId: number | undefined,
): AnimalRelatedDataResult {
	const { showToast } = useToast();

	const [geneticImprovements, setGeneticImprovements] = useState<any[]>([]);
	const [diseases, setDiseases] = useState<any[]>([]);
	const [fields, setFields] = useState<any[]>([]);
	const [vaccinations, setVaccinations] = useState<any[]>([]);
	const [treatments, setTreatments] = useState<any[]>([]);
	const [controls, setControls] = useState<any[]>([]);
	const [animalImages, setAnimalImages] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [imagesLoading, setImagesLoading] = useState(true);
	const [isManualRefreshing, setIsManualRefreshing] = useState(false);
	const [hasRecentTreatments, setHasRecentTreatments] = useState<
		boolean | null
	>(null);
	const [deletingItemId, setDeletingItemId] = useState<string | number | null>(
		null,
	);
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<
		string | number | null
	>(null);

	const [diseaseOptions, setDiseaseOptions] = useState<Record<number, string>>(
		{},
	);
	const [fieldOptions, setFieldOptions] = useState<Record<number, string>>({});
	const [vaccineOptions, setVaccineOptions] = useState<Record<number, string>>(
		{},
	);
	const [userOptions, setUserOptions] = useState<Record<number, string>>({});

	const [triggers, setTriggers] = useState({
		genetic: 0,
		diseases: 0,
		fields: 0,
		vaccinations: 0,
		treatments: 0,
		controls: 0,
		images: 0,
		general: 0,
	});

	// Load catalogs
	useEffect(() => {
		const loadOptions = async () => {
			try {
				const [diseasesRes, fieldsRes, vaccinesRes, usersRes] =
					await Promise.all([
						diseaseService
							.getDiseases({ page: 1, limit: 1000 })
							.catch(() => ({ data: [] })),
						fieldService
							.getFields({ page: 1, limit: 1000 })
							.catch(() => ({ data: [] })),
						vaccinesService
							.getVaccines?.({ page: 1, limit: 1000 })
							.catch(() => ({ data: [] })),
						usersService
							.getUsers({ page: 1, limit: 1000 })
							.catch(() => ({ data: [] })),
					]);
				const dMap: Record<number, string> = {};
				((diseasesRes as any)?.data || diseasesRes || []).forEach((d: any) => {
					dMap[d.id] = d.disease || d.name;
				});
				setDiseaseOptions(dMap);
				const fMap: Record<number, string> = {};
				((fieldsRes as any)?.data || fieldsRes || []).forEach((f: any) => {
					fMap[f.id] = f.name;
				});
				setFieldOptions(fMap);
				const vMap: Record<number, string> = {};
				((vaccinesRes as any)?.data || vaccinesRes || []).forEach((v: any) => {
					vMap[v.id] = v.name;
				});
				setVaccineOptions(vMap);
				const uMap: Record<number, string> = {};
				((usersRes as any)?.data || usersRes || []).forEach((u: any) => {
					uMap[u.id] = u.fullname || u.name;
				});
				setUserOptions(uMap);
			} catch (err) {
				devLogger.error("[useAnimalRelatedData] Error loading catalogs:", err);
			}
		};
		loadOptions();
	}, []);

	useEffect(() => {
		if (!animalId) return;
		geneticImprovementsService
			.getGeneticImprovements({
				animal_id: animalId,
				page: 1,
				limit: 1000,
				cache_bust: triggers.genetic > 0 ? Date.now() : undefined,
			})
			.then((res) => {
				const all = (res as any)?.data || res || [];
				setGeneticImprovements(
					Array.isArray(all)
						? all.filter((i: any) => String(i.animal_id) === String(animalId))
						: [],
				);
			})
			.catch((e) => devLogger.error("[useAnimalRelatedData] genetic:", e));
	}, [animalId, triggers.genetic]);

	useEffect(() => {
		if (!animalId) return;
		animalDiseasesService
			.getAnimalDiseases({
				animal_id: animalId,
				page: 1,
				limit: 1000,
				cache_bust: triggers.diseases > 0 ? Date.now() : undefined,
			})
			.then((res) => {
				const all = (res as any)?.data || res || [];
				setDiseases(
					Array.isArray(all)
						? all.filter((i: any) => String(i.animal_id) === String(animalId))
						: [],
				);
			})
			.catch((e) => devLogger.error("[useAnimalRelatedData] diseases:", e));
	}, [animalId, triggers.diseases]);

	useEffect(() => {
		if (!animalId) return;
		animalFieldsService
			.getAnimalFields({
				animal_id: animalId,
				page: 1,
				limit: 1000,
				cache_bust: triggers.fields > 0 ? Date.now() : undefined,
			})
			.then((res) => {
				const all = (res as any)?.data || res || [];
				setFields(
					Array.isArray(all)
						? all.filter((i: any) => String(i.animal_id) === String(animalId))
						: [],
				);
			})
			.catch((e) => devLogger.error("[useAnimalRelatedData] fields:", e));
	}, [animalId, triggers.fields]);

	useEffect(() => {
		if (!animalId) return;
		vaccinationsService
			.getVaccinations({
				animal_id: animalId,
				page: 1,
				limit: 1000,
				cache_bust: triggers.vaccinations > 0 ? Date.now() : undefined,
			})
			.then((res) => {
				const all = (res as any)?.data || res || [];
				setVaccinations(
					Array.isArray(all)
						? all.filter((i: any) => String(i.animal_id) === String(animalId))
						: [],
				);
			})
			.catch((e) => devLogger.error("[useAnimalRelatedData] vaccinations:", e));
	}, [animalId, triggers.vaccinations]);

	useEffect(() => {
		if (!animalId) return;
		treatmentsService
			.getTreatments({
				animal_id: animalId,
				page: 1,
				limit: 1000,
				cache_bust: triggers.treatments > 0 ? Date.now() : undefined,
			})
			.then((res) => {
				const all = (res as any)?.data || res || [];
				setTreatments(
					Array.isArray(all)
						? all.filter((i: any) => String(i.animal_id) === String(animalId))
						: [],
				);
			})
			.catch((e) => devLogger.error("[useAnimalRelatedData] treatments:", e));
	}, [animalId, triggers.treatments]);

	useEffect(() => {
		if (!animalId) return;
		controlService
			.getControls({
				animal_id: animalId,
				page: 1,
				limit: 1000,
				cache_bust: triggers.controls > 0 ? Date.now() : undefined,
			})
			.then((res) => {
				const all = (res as any)?.data || res || [];
				setControls(
					Array.isArray(all)
						? all.filter((i: any) => String(i.animal_id) === String(animalId))
						: [],
				);
			})
			.catch((e) => devLogger.error("[useAnimalRelatedData] controls:", e));
	}, [animalId, triggers.controls]);

	useEffect(() => {
		if (!animalId) return;
		setImagesLoading(true);
		animalImageService
			.getAnimalImages(animalId)
			.then((res) => setAnimalImages(res?.data?.images || []))
			.catch((e) => devLogger.error("[useAnimalRelatedData] images:", e))
			.finally(() => setImagesLoading(false));
	}, [animalId, triggers.images]);

	useEffect(() => {
		const now = Date.now();
		const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
		const recent = (arr: any[], dateField: string) =>
			arr.some((item) => {
				const d = new Date(item[dateField] || item.date || item.created_at);
				return !isNaN(d.getTime()) && now - d.getTime() <= THIRTY_DAYS;
			});
		setHasRecentTreatments(
			recent(treatments, "treatment_date") ||
				recent(vaccinations, "vaccination_date"),
		);
		setLoading(false);
	}, [treatments, vaccinations]);

	const handleRefresh = useCallback((type?: string) => {
		const mapping: Record<string, keyof typeof triggers> = {
			genetic_improvement: "genetic",
			animal_disease: "diseases",
			animal_field: "fields",
			vaccination: "vaccinations",
			treatment: "treatments",
			control: "controls",
		};
		if (!type) {
			setTriggers((prev) => ({
				...prev,
				genetic: prev.genetic + 1,
				diseases: prev.diseases + 1,
				fields: prev.fields + 1,
				vaccinations: prev.vaccinations + 1,
				treatments: prev.treatments + 1,
				controls: prev.controls + 1,
				images: prev.images + 1,
				general: prev.general + 1,
			}));
			return;
		}
		const key = mapping[type];
		if (key) setTriggers((prev) => ({ ...prev, [key]: prev[key] + 1 }));
		else setTriggers((prev) => ({ ...prev, general: prev.general + 1 }));
	}, []);

	const triggerGlobalRefresh = useCallback(() => {
		handleRefresh();
	}, [handleRefresh]);

	const handleDeleteRecord = useCallback(
		async (type: string | null, item: any) => {
			if (!type || !item) return;
			const recordId = resolveRecordId(item);
			if (!recordId) {
				showToast("No se pudo determinar el ID del registro", "error");
				return;
			}

			try {
				if (type === "treatment") {
					const depCheck = await checkTreatmentDependencies(recordId as number);
					if (depCheck.hasDependencies) {
						const depSummary =
							depCheck.dependencies
								?.map((d: any) => `${d.count} ${d.entity}`)
								.join(", ") || "registros asociados";
						showToast(
							`⚠️ No se puede eliminar este tratamiento porque tiene ${depSummary}. Elimina primero las dependencias.`,
							"error",
						);
						throw new Error("Dependency check failed");
					}
				}

				switch (type) {
					case "genetic_improvement":
						await geneticImprovementsService.deleteGeneticImprovement(
							recordId as any,
						);
						break;
					case "animal_disease":
						await animalDiseasesService.deleteAnimalDisease(recordId as any);
						break;
					case "animal_field":
						await animalFieldsService.deleteAnimalField(recordId as any);
						break;
					case "vaccination":
						await vaccinationsService.deleteVaccination(recordId as any);
						break;
					case "treatment":
						await treatmentsService.deleteTreatment(recordId as any);
						break;
					case "control":
						await controlService.deleteControl(recordId as any);
						break;
					default:
						throw new Error("Tipo de registro no soportado para eliminación");
				}

				const idStr = String(recordId);
				switch (type) {
					case "genetic_improvement":
						setGeneticImprovements((prev) =>
							prev.filter((i) => String(resolveRecordId(i)) !== idStr),
						);
						break;
					case "animal_disease":
						setDiseases((prev) =>
							prev.filter((i) => String(resolveRecordId(i)) !== idStr),
						);
						break;
					case "animal_field":
						setFields((prev) =>
							prev.filter((i) => String(resolveRecordId(i)) !== idStr),
						);
						break;
					case "vaccination":
						setVaccinations((prev) =>
							prev.filter((i) => String(resolveRecordId(i)) !== idStr),
						);
						break;
					case "treatment":
						setTreatments((prev) =>
							prev.filter((i) => String(resolveRecordId(i)) !== idStr),
						);
						break;
					case "control":
						setControls((prev) =>
							prev.filter((i) => String(resolveRecordId(i)) !== idStr),
						);
						break;
				}

				switch (type) {
					case "genetic_improvement":
						await geneticImprovementsService.clearCache();
						break;
					case "animal_disease":
						await animalDiseasesService.clearCache();
						break;
					case "animal_field":
						await animalFieldsService.clearCache();
						break;
					case "vaccination":
						await vaccinationsService.clearCache();
						break;
					case "treatment":
						await treatmentsService.clearCache();
						break;
					case "control":
						await controlService.clearCache();
						break;
				}
				if (animalId) clearAnimalDependencyCache(animalId);

				showToast("Registro eliminado correctamente", "success");
			} catch (error: any) {
				if (error.message === "Dependency check failed") return;
				const errorMessage =
					error.message || error.response?.data?.message || "Error desconocido";
				const isIntegrityError =
					String(errorMessage).toLowerCase().includes("foreign key") ||
					String(errorMessage).toLowerCase().includes("constraint") ||
					String(errorMessage).toLowerCase().includes("dependenc") ||
					String(errorMessage).toLowerCase().includes("relacionado") ||
					error.status === 409 ||
					error.response?.status === 409;

				if (isIntegrityError)
					showToast(
						"⚠️ No se puede eliminar este registro porque tiene datos dependientes.",
						"error",
					);
				else if (
					error.status === 404 ||
					error.response?.status === 404 ||
					String(errorMessage).toLowerCase().includes("no encontrado")
				) {
					showToast("El registro ya no existe o fue eliminado.", "info");
					triggerGlobalRefresh();
				} else {
					showToast("Error al eliminar: " + errorMessage, "error");
				}
			}
		},
		[animalId, showToast, triggerGlobalRefresh],
	);

	return {
		geneticImprovements,
		diseases,
		fields,
		vaccinations,
		treatments,
		controls,
		animalImages,
		loading,
		imagesLoading,
		hasRecentTreatments,
		isManualRefreshing,
		diseaseOptions,
		fieldOptions,
		vaccineOptions,
		userOptions,
		deletingItemId,
		confirmingDeleteId,
		setDeletingItemId,
		setConfirmingDeleteId,
		setGeneticImprovements,
		setDiseases,
		setFields,
		setVaccinations,
		setTreatments,
		setControls,
		handleRefresh,
		handleDeleteRecord,
		setIsManualRefreshing,
		triggerGlobalRefresh,
	};
}
