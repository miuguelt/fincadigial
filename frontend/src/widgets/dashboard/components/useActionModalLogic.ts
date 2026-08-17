import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { alertService } from "@/entities/alert/api/alert.service";
import { animalDiseasesService } from "@/entities/animal-disease/api/animalDiseases.service";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { controlService } from "@/entities/control/api/control.service";
import { geneticImprovementsService } from "@/entities/genetic-improvement/api/geneticImprovements.service";
import { milkService } from "@/entities/milk/api/milk.service";
import { reproductionService } from "@/entities/reproduction/api/reproduction.service";
import { taskService } from "@/entities/task/api/task.service";
import { treatmentsService } from "@/entities/treatment/api/treatments.service";
import { vaccinationsService } from "@/entities/vaccination/api/vaccinations.service";
import {
	checkTreatmentDependencies,
	clearAnimalDependencyCache,
} from "@/features/diagnostics/api/dependencyCheck.service";
import { ApiFetchError } from "@/shared/api/apiFetch";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import { devLogger } from "@/shared/utils/devLogger";
import { resolveRecordId } from "@/shared/utils/recordIdUtils";
import type { ModalMode } from "../AnimalActionsMenu.types";

export type EntityType = string | null;

interface UseActionModalParams {
	type: EntityType;
	mode: ModalMode;
	animal: any;
	currentUserId?: number;
	initialEditingItem: any;
	onClose: () => void;
	onRefreshParent?: (type?: string) => void;
	loadOptions?: () => void;
}

export function useActionModalLogic({
	type,
	mode,
	animal,
	currentUserId,
	initialEditingItem,
	onClose,
	onRefreshParent,
	loadOptions = () => {},
}: UseActionModalParams) {
	const { showToast } = useToast();
	const [modalMode, setModalMode] = useState<ModalMode>(
		mode === "edit" ? "create" : mode,
	);
	const [editingItem, setEditingItem] = useState<any | null>(
		initialEditingItem,
	);
	const [formData, setFormData] = useState<any>(initialEditingItem || {});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [validationErrors, setValidationErrors] = useState<any | null>(null);
	const [listData, setListData] = useState<any[]>([]);
	const [pendingBulkItems, setPendingBulkItems] = useState<any[]>([]);
	const [loadingList, setLoadingList] = useState(false);
	const [deletingItemId, setDeletingItemId] = useState<string | number | null>(
		null,
	);
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<
		string | number | null
	>(null);

	const modalStateId = useMemo(
		() => Math.random().toString(36).substring(2, 9),
		[],
	);

	const loadListData = useCallback(
		async (forceRefresh = false) => {
			setLoadingList(true);
			try {
				let data: any[] = [];
				const filterById = (items: any) => {
					const arr = Array.isArray(items)
						? items
						: items?.data || items?.items || [];
					return arr.filter(
						(item: any) =>
							String(item.animal_id || item.animalId) === String(animal.id),
					);
				};
				const params = {
					animal_id: animal.id,
					limit: 100,
					cache_bust: forceRefresh ? Date.now() : undefined,
				} as any;
				switch (type) {
					case "genetic_improvement":
						data = filterById(
							await geneticImprovementsService.getGeneticImprovements(params),
						);
						break;
					case "animal_disease":
						data = filterById(
							await animalDiseasesService.getAnimalDiseases(params),
						);
						break;
					case "animal_field":
						data = filterById(
							await animalFieldsService.getAnimalFields(params),
						);
						break;
					case "vaccination":
						data = filterById(
							await vaccinationsService.getVaccinations(params),
						);
						break;
					case "treatment":
						data = filterById(await treatmentsService.getTreatments(params));
						break;
					case "control":
						data = filterById(await controlService.getControls(params));
						break;
					case "milk_production":
						data = filterById(await milkService.getByAnimal(animal.id, params));
						break;
					case "reproduction_event":
						data = filterById(
							await reproductionService.getEvents({
								...params,
								page: 1,
								limit: 100,
							}),
						);
						break;
					case "alert":
						data = filterById(
							await alertService.getAlerts({ ...params, page: 1, limit: 100 }),
						);
						break;
					case "task":
						data = filterById(
							await taskService.getAll({ ...params, page: 1, limit: 100 }),
						);
						break;
				}
				setListData(data);
			} catch (err: any) {
				devLogger.error("[useActionModalLogic] Error loading list:", err);
				setError("Error al cargar los registros");
			} finally {
				setLoadingList(false);
			}
		},
		[animal.id, type],
	);

	// Init form defaults
	useEffect(() => {
		if (modalMode === "create" && !editingItem) {
			const today = getTodayColombia();
			const base = { animal_id: animal.id };
			switch (type) {
				case "genetic_improvement":
					setFormData({
						...base,
						date: today,
						genetic_event_technique: "",
						details: "",
						results: "",
					});
					break;
				case "animal_disease":
					setFormData({
						...base,
						disease_id: undefined,
						instructor_id: currentUserId,
						diagnosis_date: today,
						status: "Activo",
						notes: "",
					});
					break;
				case "animal_field":
					setFormData({
						...base,
						field_id: undefined,
						assignment_date: today,
						removal_date: undefined,
						notes: "",
					});
					break;
				case "vaccination":
					setFormData({
						...base,
						vaccine_id: undefined,
						vaccination_date: today,
						instructor_id: currentUserId,
						apprentice_id: undefined,
					});
					break;
				case "treatment":
					setFormData({
						...base,
						treatment_date: today,
						description: "",
						dosis: "",
						frequency: "",
						observations: "",
					});
					break;
				case "control":
					setFormData({
						...base,
						checkup_date: today,
						weight: undefined,
						height: undefined,
						health_status: "Sano",
						description: "",
					});
					break;
				case "milk_production":
					setFormData({
						...base,
						date: today,
						liters: "",
						session: "AM",
						notes: "",
					});
					break;
				case "reproduction_event":
					setFormData({
						...base,
						event_date: today,
						event_type: "",
						technique: "",
						notes: "",
					});
					break;
				case "alert":
					setFormData({
						...base,
						alert_type: "Salud",
						message: "",
						recommendation: "",
						priority: "Media",
					});
					break;
				case "task":
					setFormData({
						...base,
						title: "",
						description: "",
						priority: "Media",
						status: "Pendiente",
						due_date: "",
					});
					break;
			}
		}
	}, [type, modalMode, animal.id, currentUserId, editingItem]);

	useEffect(() => {
		if (modalMode === "create") loadOptions();
		else if (modalMode === "list") loadListData();
	}, [modalMode, loadOptions, loadListData]);

	const handleSubmit = async (stayInCreateMode = false) => {
		setLoading(true);
		setError(null);
		try {
			const isEditing = !!editingItem;
			const targetId = isEditing ? resolveRecordId(editingItem) : null;
			if (isEditing && !targetId)
				throw new Error(
					"Error interno: No se pudo identificar el registro a actualizar (ID desconocido).",
				);

			const dataToSend = {
				...formData,
				animal_id: animal.id,
				animalId: animal.id,
			};

			// Validation
			if (
				type === "genetic_improvement" &&
				(!dataToSend.date || !dataToSend.genetic_event_technique?.trim())
			)
				throw new Error("Complete los campos obligatorios.");
			if (
				type === "animal_disease" &&
				(!dataToSend.disease_id || !dataToSend.diagnosis_date)
			)
				throw new Error("Complete los campos obligatorios.");
			if (
				type === "animal_field" &&
				(!dataToSend.field_id || !dataToSend.assignment_date)
			)
				throw new Error("Complete los campos obligatorios.");
			if (
				type === "vaccination" &&
				(!dataToSend.vaccine_id || !dataToSend.vaccination_date)
			)
				throw new Error("Complete los campos obligatorios.");
			if (
				type === "treatment" &&
				(!dataToSend.treatment_date || !dataToSend.description?.trim())
			)
				throw new Error("Complete los campos obligatorios.");
			if (
				type === "control" &&
				(!dataToSend.checkup_date || !dataToSend.health_status)
			)
				throw new Error("Complete los campos obligatorios.");
			if (
				type === "milk_production" &&
				(!dataToSend.date || !dataToSend.liters || !dataToSend.session)
			)
				throw new Error("Complete los campos obligatorios.");
			if (
				type === "reproduction_event" &&
				(!dataToSend.event_date || !dataToSend.event_type)
			)
				throw new Error("Complete los campos obligatorios.");
			if (
				type === "alert" &&
				(!dataToSend.alert_type || !dataToSend.message?.trim())
			)
				throw new Error("Complete los campos obligatorios.");
			if (type === "task" && !dataToSend.title?.trim())
				throw new Error("Complete los campos obligatorios.");

			switch (type) {
				case "genetic_improvement":
					isEditing
						? await geneticImprovementsService.updateGeneticImprovement(
								targetId as any,
								dataToSend,
							)
						: await geneticImprovementsService.createGeneticImprovement(
								dataToSend,
							);
					break;
				case "animal_disease":
					isEditing
						? await animalDiseasesService.updateAnimalDisease(
								targetId as any,
								dataToSend,
							)
						: await animalDiseasesService.createAnimalDisease(dataToSend);
					break;
				case "animal_field":
					isEditing
						? await animalFieldsService.updateAnimalField(
								targetId as any,
								dataToSend,
							)
						: await animalFieldsService.createAnimalField(dataToSend);
					break;
				case "vaccination":
					isEditing
						? await vaccinationsService.updateVaccination(
								targetId as any,
								dataToSend,
							)
						: await vaccinationsService.createVaccination(dataToSend);
					break;
				case "treatment":
					isEditing
						? await treatmentsService.updateTreatment(
								targetId as any,
								dataToSend,
							)
						: await treatmentsService.createTreatment(dataToSend);
					break;
				case "control":
					if (isEditing) {
						await controlService.updateControl(targetId as any, dataToSend);
					} else if (pendingBulkItems.length > 0) {
						await controlService.createBulk([
							...pendingBulkItems.map((i) => ({
								...i,
								animal_id: animal.id,
								animalId: animal.id,
							})),
							dataToSend,
						]);
					} else {
						await controlService.createControl(dataToSend);
					}
					break;
				case "milk_production":
					isEditing
						? await milkService.update(targetId as any, dataToSend)
						: await milkService.create(dataToSend);
					break;
				case "reproduction_event":
					isEditing
						? await reproductionService.update(targetId as any, dataToSend)
						: await reproductionService.create(dataToSend);
					break;
				case "alert":
					isEditing
						? await alertService.update(targetId as any, dataToSend)
						: await alertService.create(dataToSend);
					break;
				case "task":
					isEditing
						? await taskService.update(targetId as any, dataToSend)
						: await taskService.create(dataToSend);
					break;
			}
			setPendingBulkItems([]);

			if (stayInCreateMode && !isEditing) {
				const prevDate =
					dataToSend.checkup_date ||
					dataToSend.date ||
					dataToSend.vaccination_date ||
					dataToSend.treatment_date ||
					dataToSend.diagnosis_date ||
					dataToSend.assignment_date;
				const baseReset = { animal_id: animal.id };
				if (type === "control")
					setFormData({
						...baseReset,
						checkup_date: prevDate,
						health_status: "Sano",
						weight: "",
						height: "",
						description: "",
					});
				else if (type === "vaccination")
					setFormData({
						...baseReset,
						vaccination_date: prevDate,
						vaccine_id: "",
						instructor_id: currentUserId,
					});
				else if (type === "treatment")
					setFormData({
						...baseReset,
						treatment_date: prevDate,
						description: "",
						dosis: "",
						frequency: "",
						observations: "",
					});
				else setFormData({ ...baseReset });
				showToast(
					"Registro guardado exitosamente. Puede continuar agregando.",
					"success",
				);
			} else {
				onClose();
				showToast(
					isEditing
						? "Registro actualizado correctamente"
						: "Registro creado correctamente",
					"success",
				);
			}
			setTimeout(() => {
				onRefreshParent?.(type || undefined);
				window.dispatchEvent(new CustomEvent("crud:refetch"));
				window.dispatchEvent(new CustomEvent("animal-fields:updated"));
			}, 600);
		} catch (err: any) {
			let msg =
				err?.response?.data?.message || err.message || "Error al guardar";
			setValidationErrors(null);
			if (err instanceof ApiFetchError && err.validationErrors) {
				setValidationErrors(err.validationErrors);
				msg = "Por favor, corrige los siguientes errores:";
			}
			setError(msg);
		} finally {
			setLoading(false);
		}
	};

	const handleEdit = (item: any) => {
		setEditingItem(item);

		const data = { ...item };
		// Preprocesar fechas para que funcionen con <input type="date"> (requiere formato YYYY-MM-DD)
		const dateFields = [
			"date", "diagnosis_date", "assignment_date", "removal_date",
			"vaccination_date", "treatment_date", "checkup_date",
			"event_date", "due_date"
		];
		dateFields.forEach(field => {
			if (data[field] && typeof data[field] === "string") {
				data[field] = data[field].split("T")[0];
			}
		});

		setFormData(data);
		setModalMode("create");
	};

	const handleDeleteClick = (item: any) => {
		const itemId = resolveRecordId(item);
		if (!itemId) {
			showToast("No se pudo determinar el ID del registro", "error");
			return;
		}
		if (confirmingDeleteId === itemId) {
			handleDeleteConfirm(item);
		} else {
			setConfirmingDeleteId(itemId);
			showToast("Haz clic de nuevo para confirmar la eliminación", "warning");
			setTimeout(
				() => setConfirmingDeleteId((curr) => (curr === itemId ? null : curr)),
				3000,
			);
		}
	};

	const handleDeleteConfirm = async (item: any) => {
		const itemId = resolveRecordId(item);
		if (!itemId || deletingItemId === itemId) return;
		setConfirmingDeleteId(null);
		setDeletingItemId(itemId);
		try {
			if (type === "treatment") {
				const depCheck = await checkTreatmentDependencies(itemId as number);
				if (depCheck.hasDependencies) {
					showToast(
						`No se puede eliminar: ${depCheck.dependencies?.map((d: any) => `${d.count} ${d.entity}`).join(", ") || "tiene dependencias"}. Elimínalas primero.`,
						"error",
					);
					setDeletingItemId(null);
					return;
				}
			}
			switch (type) {
				case "genetic_improvement":
					await geneticImprovementsService.deleteGeneticImprovement(
						itemId as any,
					);
					geneticImprovementsService.clearCache();
					break;
				case "animal_disease":
					await animalDiseasesService.deleteAnimalDisease(itemId as any);
					animalDiseasesService.clearCache();
					break;
				case "animal_field":
					await animalFieldsService.deleteAnimalField(itemId as any);
					animalFieldsService.clearCache();
					break;
				case "vaccination":
					await vaccinationsService.deleteVaccination(itemId as any);
					vaccinationsService.clearCache();
					break;
				case "treatment":
					await treatmentsService.deleteTreatment(itemId as any);
					treatmentsService.clearCache();
					break;
				case "control":
					await controlService.deleteControl(itemId as any);
					controlService.clearCache();
					break;
				case "milk_production":
					await milkService.delete(itemId as any);
					break;
				case "reproduction_event":
					await reproductionService.delete(itemId as any);
					break;
				case "alert":
					await alertService.delete(itemId as any);
					break;
				case "task":
					await taskService.delete(itemId as any);
					break;
			}
			setListData((prev) =>
				prev.filter((i) => String(resolveRecordId(i)) !== String(itemId)),
			);
			showToast("Registro eliminado correctamente", "success");
			if (animal?.id) clearAnimalDependencyCache(animal.id);
			setTimeout(() => {
				onRefreshParent?.(type || undefined);
				window.dispatchEvent(new CustomEvent("crud:refetch"));
				window.dispatchEvent(new CustomEvent("animal-fields:updated"));
			}, 600);
		} catch (err: any) {
			const errorStatus = err.status ?? err.response?.status;
			const errorMessage =
				err.message || err.response?.data?.message || "Error desconocido";
			const isNotFound =
				errorStatus === 404 ||
				String(errorMessage).toLowerCase().includes("no encontrado") ||
				String(errorMessage).toLowerCase().includes("not found");
			if (isNotFound) {
				showToast("El registro ya fue eliminado", "info");
				setListData((prev) =>
					prev.filter((i) => String(resolveRecordId(i)) !== String(itemId)),
				);
				if (animal?.id) clearAnimalDependencyCache(animal.id);
			} else {
				showToast("Error al eliminar: " + errorMessage, "error");
			}
		} finally {
			setDeletingItemId(null);
		}
	};

	const handleReplicate = () => {
		if (!editingItem) return;
		const replicatedData = { ...editingItem };
		delete replicatedData.id;
		delete replicatedData.created_at;
		delete replicatedData.updated_at;
		delete replicatedData.code;
		const today = getTodayColombia();
		if (replicatedData.checkup_date) replicatedData.checkup_date = today;
		if (replicatedData.date) replicatedData.date = today;
		if (replicatedData.vaccination_date)
			replicatedData.vaccination_date = today;
		if (replicatedData.treatment_date) replicatedData.treatment_date = today;
		if (replicatedData.diagnosis_date) replicatedData.diagnosis_date = today;
		if (replicatedData.assignment_date) replicatedData.assignment_date = today;
		replicatedData.animal_id = animal.id;
		setFormData(replicatedData);
		setEditingItem(null);
		setModalMode("create");
		showToast(
			"Modo replicación: Datos copiados. Ajuste la fecha si es necesario.",
			"info",
		);
	};

	const getModalTitle = useCallback(() => {
		const modeText =
			modalMode === "create"
				? editingItem
					? "Editar"
					: "Registrar"
				: "Historial de";
		const typeLabel =
			(
				{
					genetic_improvement: "Mejora Genética",
					animal_disease: "Enfermedad",
					animal_field: "Asignación de Campo",
					vaccination: "Vacunación",
					treatment: "Tratamiento",
					control: "Control",
					milk_production: "Producción de Leche",
					reproduction_event: "Evento Reproductivo",
					alert: "Alerta",
					task: "Tarea",
					report: "Análisis de Rendimiento",
				} as any
			)[type as string] || "Acción";
		return `${modeText} ${typeLabel} - Animal #${animal.record || animal.id}`;
	}, [modalMode, editingItem, type, animal.record, animal.id]);

	return {
		modalMode,
		setModalMode,
		editingItem,
		setEditingItem,
		formData,
		setFormData,
		loading,
		error,
		setError,
		validationErrors,
		listData,
		setListData,
		pendingBulkItems,
		setPendingBulkItems,
		loadingList,
		deletingItemId,
		confirmingDeleteId,
		modalStateId,
		loadListData,
		handleSubmit,
		handleEdit,
		handleDelete: handleDeleteClick,
		handleReplicate,
		getModalTitle,
	};
}
