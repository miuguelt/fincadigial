import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalsService } from "@/entities/animal/api/animal.service";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { fieldService } from "@/entities/field/api/field.service";
import { devLogger } from "@/shared/utils/devLogger";
import { getTodayColombia } from "@/shared/utils/dateUtils";

export interface Field {
	id: number;
	name: string;
	ubication: string;
	state: string;
	capacity: string;
	animal_count: number;
	last_grazing_date?: string | null;
	rest_days?: number;
	grazing_days?: number;
	is_grazing_ready?: boolean;
	rest_days_remaining?: number;
}

const getItemsFromResponse = <T>(response: any): T[] => {
	if (Array.isArray(response)) return response as T[];
	if (Array.isArray(response?.data)) return response.data as T[];
	if (Array.isArray(response?.items)) return response.items as T[];
	if (Array.isArray(response?.results)) return response.results as T[];
	return [];
};

const parseCapacity = (value: unknown) => {
	const parsed = Number.parseInt(String(value ?? ""), 10);
	return Number.isFinite(parsed) ? parsed : null;
};

export type RotationStatus = 'ready' | 'resting' | 'grazing' | 'critical' | 'unknown';

export interface RotationInfo {
	status: RotationStatus;
	daysRemaining: number;
	lastGrazingDate: string | null;
	restDays: number;
	grazingDays: number;
	overdueDays: number;
}

export const getRotationInfo = (field: Field): RotationInfo => {
	const restDays = field.rest_days ?? 30;
	const grazingDays = field.grazing_days ?? 3;
	const lastGrazing = field.last_grazing_date ?? null;

	if (!lastGrazing) {
		return {
			status: 'ready',
			daysRemaining: restDays,
			lastGrazingDate: null,
			restDays,
			grazingDays,
			overdueDays: 0,
		};
	}

	const lastDate = new Date(lastGrazing + 'T00:00:00');
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const daysPassed = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
	const daysRemaining = Math.max(0, restDays - daysPassed);
	const overdueDays = Math.max(0, daysPassed - restDays);

	let status: RotationStatus;
	if (daysPassed >= restDays) {
		status = 'ready';
	} else if (field.is_grazing_ready === false && daysRemaining <= Math.floor(restDays * 0.25)) {
		status = 'critical';
	} else if (daysPassed < grazingDays) {
		status = 'grazing';
	} else {
		status = 'resting';
	}

	return {
		status,
		daysRemaining,
		lastGrazingDate: lastGrazing,
		restDays,
		grazingDays,
		overdueDays,
	};
};

export interface SuccessData {
	transferredCount: number;
	skippedCount: number;
	fieldName: string;
	fieldId: number;
	oldCount: number;
	newCount: number;
	totalRequested: number;
}

export const useBatchFieldTransfer = (
	isOpen: boolean,
	selectedAnimalIds: number[],
	onClose: () => void,
	onSuccess: () => void,
) => {
	const { showToast } = useToast();

	const [fields, setFields] = useState<Field[]>([]);
	const [selectedAnimals, setSelectedAnimals] = useState<any[]>([]);
	const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
	const [transferDate, setTransferDate] = useState(getTodayColombia());
	const [notes, setNotes] = useState("");
	const [transferring, setTransferring] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [successData, setSuccessData] = useState<SuccessData | null>(null);

	const fetchFields = useCallback(async () => {
		try {
			const resp = await fieldService.getFields({
				limit: 100,
				cache_bust: Date.now(),
			});
			const items = getItemsFromResponse<Field>(resp);
			devLogger.log(
				"[useBatchFieldTransfer] Fields loaded:",
				items.map((f: Field) => ({
					id: f.id,
					name: f.name,
					animal_count: f.animal_count,
				})),
			);
			setFields(items);
		} catch {
			showToast("Error al cargar potreros", "error");
		}
	}, [showToast]);

	const fetchSelectedAnimals = useCallback(async () => {
		if (selectedAnimalIds.length === 0) return;
		try {
			const resp = await animalsService.getAnimals({
				id: selectedAnimalIds.join(","),
				limit: selectedAnimalIds.length,
				cache_bust: 1,
			});
			setSelectedAnimals(resp);
		} catch (error) {
			devLogger.error("Error fetching animals:", error);
			showToast("Error al cargar datos de los animales", "error");
		}
	}, [selectedAnimalIds, showToast]);

	useEffect(() => {
		if (isOpen) {
			setSelectedFieldId(null);
			setTransferDate(getTodayColombia());
			setNotes("");
			setSearchQuery("");
			fetchFields();
			fetchSelectedAnimals();
		}
	}, [isOpen, fetchFields, fetchSelectedAnimals]);

	const filteredFields = useMemo(() => {
		const defaultFields =
			searchQuery === "" ||
			"quitar".includes(searchQuery.toLowerCase()) ||
			"potrero".includes(searchQuery.toLowerCase())
				? [
						{
							id: -1,
							name: "Quitar del Potrero (Dejar Libre)",
							ubication: "Sin asignación física",
							state: "Activo",
							capacity: null as unknown as string,
							animal_count: 0,
						},
					]
				: [];

		const matchedFields = fields.filter(
			(f) =>
				f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				f.ubication?.toLowerCase().includes(searchQuery.toLowerCase()),
		);

		return [...defaultFields, ...matchedFields];
	}, [fields, searchQuery]);

	const selectedField = useMemo(() => {
		if (selectedFieldId === -1) {
			return {
				id: -1,
				name: "Quitar del Potrero (Dejar Libre)",
				ubication: "Sin asignación física",
				state: "Activo",
				capacity: null as unknown as string,
				animal_count: 0,
			};
		}
		return fields.find((field) => field.id === selectedFieldId) || null;
	}, [fields, selectedFieldId]);

	const selectedFieldCapacity = useMemo(() => {
		return selectedField ? parseCapacity(selectedField.capacity) : null;
	}, [selectedField]);

	const projectedOccupancy = useMemo(() => {
		return (selectedField?.animal_count ?? 0) + selectedAnimalIds.length;
	}, [selectedField, selectedAnimalIds]);

	const isOverCapacity = useMemo(() => {
		return (
			selectedFieldCapacity !== null &&
			projectedOccupancy > selectedFieldCapacity
		);
	}, [selectedFieldCapacity, projectedOccupancy]);

	const selectedFieldRotation = useMemo(() => {
		if (!selectedField || selectedField.id === -1) return null;
		return getRotationInfo(selectedField);
	}, [selectedField]);

	const handleTransfer = async () => {
		if (selectedFieldId === null || selectedAnimalIds.length === 0) return;
		setTransferring(true);
		try {
			let response;
			const removed = selectedFieldId === -1;
			if (removed) {
				response = await animalFieldsService.bulkRemove({
					animal_ids: selectedAnimalIds,
					date: transferDate,
				});
			} else {
				response = await animalFieldsService.bulkTransfer({
					animal_ids: selectedAnimalIds,
					field_id: selectedFieldId,
					date: transferDate,
					notes:
						notes || `Traslado masivo de ${selectedAnimalIds.length} animales`,
				});
			}

			devLogger.log("[useBatchFieldTransfer] Transfer response:", response);
			if (response.success) {
				const meta = (response as any).meta as
					| {
							transferred_count?: number;
							skipped_count?: number;
							total_requested?: number;
							skipped_animal_ids?: number[];
					  }
					| undefined;

				const transferredCount =
					meta?.transferred_count ??
					(Array.isArray(response.data) ? response.data.length : 0);
				const skippedCount = meta?.skipped_count ?? 0;
				const fieldName = selectedField?.name ?? "el potrero de destino";

				if (removed) {
					// Operación de retiro
					if (transferredCount === 0) {
						showToast(
							"Los animales seleccionados no tenían asignación activa en ningún potrero",
							"warning",
						);
					} else if (skippedCount > 0) {
						showToast(
							`${transferredCount} animales retirados. ${skippedCount} ya estaban sin asignar.`,
							"warning",
						);
					} else {
						showToast(
							`${transferredCount} animales retirados exitosamente de sus potreros`,
							"success",
						);
					}
				} else {
					// Operación de traslado
					if (transferredCount === 0 && skippedCount > 0) {
						// Todos ya estaban — warning claro
						showToast(
							`⚠️ Ningún animal fue trasladado: los ${skippedCount} seleccionados ya están en «${fieldName}». El conteo del potrero no cambia porque ya estaban allí.`,
							"warning",
						);
					} else if (skippedCount > 0) {
						// Traslado parcial
						showToast(
							`✅ ${transferredCount} animales trasladados a «${fieldName}». ${skippedCount} ya estaban en ese potrero y no se modificaron — por eso el conteo puede ser menor al esperado.`,
							"warning",
						);
					} else {
						// Traslado completo exitoso
						showToast(
							`✅ ${transferredCount} animales trasladados exitosamente a «${fieldName}»`,
							"success",
						);
					}
				}

				// Recargar fields frescos del server para mostrar datos reales
				const freshResp = await fieldService.getFields({
					limit: 100,
					cache_bust: Date.now(),
				});
				const freshFields = getItemsFromResponse<Field>(freshResp);
				setFields(freshFields);
				const destField = freshFields.find((f) => f.id === selectedFieldId);

				setSuccessData({
					transferredCount,
					skippedCount,
					fieldName: fieldName || (destField?.name ?? ""),
					fieldId: selectedFieldId,
					oldCount: selectedField?.animal_count ?? 0,
					newCount: destField?.animal_count ?? 0,
					totalRequested: selectedAnimalIds.length,
				});

				window.dispatchEvent(new CustomEvent("animal-fields:updated"));
				onSuccess();
			} else {
				showToast(response.message || "Error en la operación", "error");
			}
		} catch (error: any) {
			showToast(error.message || "Error de conexión", "error");
		} finally {
			setTransferring(false);
		}
	};

	const clearSuccess = useCallback(() => {
		setSuccessData(null);
		setSelectedFieldId(null);
		setTransferDate(getTodayColombia());
		setNotes("");
		setSearchQuery("");
		setSelectedAnimals([]);
		onClose();
	}, [onClose]);

	return {
		selectedAnimals,
		selectedFieldId,
		setSelectedFieldId,
		transferDate,
		setTransferDate,
		notes,
		setNotes,
		transferring,
		searchQuery,
		setSearchQuery,
		filteredFields,
		selectedField,
		selectedFieldCapacity,
		projectedOccupancy,
		isOverCapacity,
		selectedFieldRotation,
		handleTransfer,
		successData,
		clearSuccess,
	};
};
