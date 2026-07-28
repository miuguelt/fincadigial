import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { medicationsService } from "@/entities/medication/api/medications.service";
import { treatmentMedicationService } from "@/entities/treatment-medication/api/treatmentMedication.service";
import { treatmentVaccinesService } from "@/entities/treatment-vaccine/api/treatmentVaccines.service";
import { vaccinesService } from "@/entities/vaccine/api/vaccines.service";
import type {
	TreatmentMedicationResponse,
	TreatmentResponse,
	TreatmentVaccineResponse,
} from "@/shared/api/generated/swaggerTypes";
import { devLogger } from "@/shared/utils/devLogger";

export const useTreatmentSupplies = (
	isOpen: boolean,
	treatment: TreatmentResponse | null,
) => {
	const { showToast } = useToast();

	// Data State
	const [vaccines, setVaccines] = useState<TreatmentVaccineResponse[]>([]);
	const [medications, setMedications] = useState<TreatmentMedicationResponse[]>(
		[],
	);
	const [loadingVaccines, setLoadingVaccines] = useState(false);
	const [loadingMedications, setLoadingMedications] = useState(false);

	// Options State
	const [vaccineOptions, setVaccineOptions] = useState<
		{ value: number; label: string }[]
	>([]);
	const [medicationOptions, setMedicationOptions] = useState<
		{ value: number; label: string }[]
	>([]);
	const [vaccineDoseMap, setVaccineDoseMap] = useState<Record<number, string>>(
		{},
	);

	const [vaccineRouteMap, setVaccineRouteMap] = useState<
		Record<number, string>
	>({});
	const [vaccineFullMap, setVaccineFullMap] = useState<Record<number, any>>({});
	const [medicationFullMap, setMedicationFullMap] = useState<
		Record<number, any>
	>({});

	// View Detail State
	const [viewDetailItem, setViewDetailItem] = useState<any>(null);
	const [viewDetailType, setViewDetailType] = useState<
		"vaccine" | "medication" | null
	>(null);

	// Create State
	const [showAddVaccine, setShowAddVaccine] = useState(false);
	const [showAddMedication, setShowAddMedication] = useState(false);
	const [vaccineSearch, setVaccineSearch] = useState("");
	const [medicationSearch, setMedicationSearch] = useState("");
	const [newVaccines, setNewVaccines] = useState<number[]>([]);
	const [newMedications, setNewMedications] = useState<number[]>([]);
	const [savingVaccine, setSavingVaccine] = useState(false);
	const [savingMedication, setSavingMedication] = useState(false);
	const [newVaccineError, setNewVaccineError] = useState<string | null>(null);
	const [newMedicationError, setNewMedicationError] = useState<string | null>(
		null,
	);

	// Delete State
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
		null,
	);
	const [deleteLoadingId, setDeleteLoadingId] = useState<{
		type: "vaccine" | "medication";
		id: number;
	} | null>(null);

	// Refs
	const associationsIdRef = useRef<number | null>(null);
	const optionsLoadedRef = useRef(false);
	const optionsLoadingRef = useRef<Promise<void> | null>(null);

	// Maps
	const vaccineLabelById = useMemo(() => {
		const map = new Map<number, string>();
		(vaccineOptions || []).forEach((o) => map.set(Number(o.value), o.label));
		return map;
	}, [vaccineOptions]);

	const medicationLabelById = useMemo(() => {
		const map = new Map<number, string>();
		(medicationOptions || []).forEach((o) => map.set(Number(o.value), o.label));
		return map;
	}, [medicationOptions]);

	// Load Options
	const loadOptions = useCallback(async () => {
		if (optionsLoadedRef.current) return;
		if (optionsLoadingRef.current) return optionsLoadingRef.current;

		const req = (async () => {
			try {
				const [vaccList, medList] = await Promise.all([
					(vaccinesService as any)
						.getAll?.({ limit: 200 })
						.catch(async () =>
							(vaccinesService as any).getVaccines?.({ limit: 200 }),
						),
					(medicationsService as any)
						.getAll?.({ limit: 200 })
						.catch(async () =>
							(medicationsService as any).getMedications?.({ limit: 200 }),
						),
				]);

				const vaccData = Array.isArray(vaccList)
					? vaccList
					: (vaccList as any)?.data || [];
				const medData = Array.isArray(medList)
					? medList
					: (medList as any)?.data || [];

				setVaccineOptions(
					(vaccData || []).map((v: any) => ({
						value: v.id,
						label: v.name || `Vacuna ${v.id}`,
					})),
				);
				setMedicationOptions(
					(medData || []).map((m: any) => ({
						value: m.id,
						label: m.name || `Medicamento ${m.id}`,
					})),
				);

				const doseEntries: [number, string][] = (vaccData || [])
					.map((v: any) => {
						const dose = (v as any).dosis ?? (v as any).dose ?? "";
						return [
							Number(v.id),
							typeof dose === "string" && dose.trim()
								? String(dose)
								: "1 dosis",
						];
					})
					.filter(([id]: [number, string]) => !!id);
				const doseMap: Record<number, string> = {};
				doseEntries.forEach(([id, dose]: [number, string]) => {
					doseMap[id] = dose;
				});
				setVaccineDoseMap(doseMap);

				const routeEntries: [number, string][] = (vaccData || [])
					.map((v: any) => [
						Number(v.id),
						(v as any).route_administration_name || "",
					])
					.filter(
						([id, name]: [number, string]) => !!id && !!String(name).trim(),
					);
				const routeMap: Record<number, string> = {};
				routeEntries.forEach(([id, name]: [number, string]) => {
					routeMap[id] = String(name);
				});
				setVaccineRouteMap(routeMap);

				const vaccMap: Record<number, any> = {};
				(vaccData || []).forEach((v: any) => {
					vaccMap[v.id] = v;
				});
				setVaccineFullMap(vaccMap);

				const medMap: Record<number, any> = {};
				(medData || []).forEach((m: any) => {
					medMap[m.id] = m;
				});
				setMedicationFullMap(medMap);

				optionsLoadedRef.current = true;
			} catch (e) {
				devLogger.error("Failed to load options", e);
			}
		})();

		optionsLoadingRef.current = req;
		try {
			await req;
		} finally {
			if (optionsLoadingRef.current === req) {
				optionsLoadingRef.current = null;
			}
		}
	}, []);

	// Fetch Associations
	const refreshAssociations = useCallback(
		async (
			treatmentId: number,
			bypassCache: boolean = false,
			target: "all" | "vaccines" | "medications" = "all",
			silent: boolean = false,
		) => {
			if (!treatmentId) return;

			if (!silent) {
				if (target === "all" || target === "vaccines") setLoadingVaccines(true);
				if (target === "all" || target === "medications")
					setLoadingMedications(true);
			}

			associationsIdRef.current = treatmentId;

			const fetchAllItems = async (
				service: any,
				method: string,
				queryParams: any,
			) => {
				let allData: any[] = [];
				let page = 1;
				const ITEMS_PER_PAGE = 50;

				while (page <= 10) {
					const p = { ...queryParams, page, limit: ITEMS_PER_PAGE };
					try {
						const res = await service[method](p);
						const list = res.data || (Array.isArray(res) ? res : []);

						if (!list || list.length === 0) break;

						const newItems = list.filter(
							(item: any) =>
								!allData.some((existing) => existing.id === item.id),
						);
						if (newItems.length === 0) break;

						allData = [...allData, ...newItems];
						page++;
					} catch (e) {
						devLogger.error(`Error fetching page ${page}`, e);
						break;
					}
				}
				return allData;
			};

			const params: any = {
				treatment_id: treatmentId,
				treatmentId: treatmentId,
				sort_by: "id",
				sort_order: "desc",
				_t: Date.now(),
			};

			if (bypassCache) {
				params.cache_bust = Date.now();
			}

			const tIdStr = String(treatmentId);
			const isNotDeleted = (item: any) => !item.deleted_at && !item.deletedAt;

			try {
				const promises: Promise<void>[] = [];

				if (target === "all" || target === "vaccines") {
					promises.push(
						(async () => {
							try {
								const vData = await fetchAllItems(
									treatmentVaccinesService,
									"getTreatmentVaccines",
									params,
								);
								const filteredVaccines = vData.filter((v: any) => {
									const vTId = v.treatment_id ?? v.treatmentId;
									return String(vTId) === tIdStr && isNotDeleted(v);
								});
								setVaccines(filteredVaccines);
							} catch (err) {
								devLogger.error("Error fetching vaccines", err);
							} finally {
								if (!silent) setLoadingVaccines(false);
							}
						})(),
					);
				}

				if (target === "all" || target === "medications") {
					promises.push(
						(async () => {
							try {
								const mData = await fetchAllItems(
									treatmentMedicationService,
									"getTreatmentMedications",
									params,
								);
								const filteredMedications = mData.filter((m: any) => {
									const mTId = m.treatment_id ?? m.treatmentId;
									return String(mTId) === tIdStr && isNotDeleted(m);
								});
								setMedications(filteredMedications);
							} catch (err) {
								devLogger.error("Error fetching medications", err);
							} finally {
								if (!silent) setLoadingMedications(false);
							}
						})(),
					);
				}

				await Promise.all(promises);
			} catch (err) {
				devLogger.error(
					"[TreatmentSuppliesModal] Error refreshing associations:",
					err,
				);
				if (!silent) {
					setLoadingVaccines(false);
					setLoadingMedications(false);
				}
			}
		},
		[],
	);

	// Initial Load
	useEffect(() => {
		if (isOpen && treatment?.id) {
			loadOptions();
			refreshAssociations(treatment.id, true, "all");
		}
	}, [isOpen, treatment, loadOptions, refreshAssociations]);

	// Reset State on Close
	useEffect(() => {
		if (!isOpen) {
			setVaccines([]);
			setMedications([]);
			setShowAddVaccine(false);
			setShowAddMedication(false);
			setNewVaccines([]);
			setNewMedications([]);
		}
	}, [isOpen]);

	const handleCreateVaccine = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!treatment) return;
		setNewVaccineError(null);
		if (!Array.isArray(newVaccines) || newVaccines.length === 0) {
			setNewVaccineError("Selecciona una vacuna.");
			return;
		}
		const selectedIds = newVaccines.filter((id) => !!id);
		const existingIds = (vaccines || [])
			.map((v: any) => Number(v.vaccine_id))
			.filter(Boolean);
		const toCreateIds = selectedIds.filter(
			(id) => !existingIds.includes(Number(id)),
		);

		if (toCreateIds.length === 0) {
			setNewVaccineError("Todas las vacunas seleccionadas ya están asociadas.");
			return;
		}

		setSavingVaccine(true);
		try {
			const payload = toCreateIds.map((id) => ({
				treatment_id: treatment.id,
				treatmentId: treatment.id,
				vaccine_id: id,
				dose: vaccineDoseMap[id] ?? "1 dosis",
			}));
			if (payload.length === 1) {
				await treatmentVaccinesService.createTreatmentVaccine(
					payload[0] as any,
				);
			} else {
				await (treatmentVaccinesService as any).createBulk(payload as any);
			}
			await treatmentVaccinesService.clearCache();
			setTimeout(() => {
				refreshAssociations(treatment.id, true, "vaccines");
			}, 1200);

			setShowAddVaccine(false);
			setNewVaccines([]);
			const names = toCreateIds.map(
				(id) => vaccineLabelById.get(Number(id)) || `#${id}`,
			);
			showToast(`Vacuna(s) asociadas: ${names.join(", ")}`, "success");
		} catch (err: any) {
			devLogger.error("Error al crear tratamiento-vacuna:", err);
			const apiMsg =
				err?.response?.data?.message ||
				err?.response?.data?.error ||
				err?.message;
			setNewVaccineError(
				apiMsg
					? `No se pudo añadir la vacuna: ${typeof apiMsg === "string" ? apiMsg : JSON.stringify(apiMsg)}`
					: "No se pudo añadir la vacuna al tratamiento.",
			);
		} finally {
			setSavingVaccine(false);
		}
	};

	const handleCreateMedication = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!treatment) return;
		setNewMedicationError(null);
		if (!Array.isArray(newMedications) || newMedications.length === 0) {
			setNewMedicationError("Selecciona un medicamento.");
			return;
		}
		const selectedIds = newMedications.filter((id) => !!id);
		const existingIds = (medications || [])
			.map((m: any) => Number(m.medication_id))
			.filter(Boolean);
		const toCreateIds = selectedIds.filter(
			(id) => !existingIds.includes(Number(id)),
		);
		if (toCreateIds.length === 0) {
			setNewMedicationError(
				"Todos los medicamentos seleccionados ya están asociados.",
			);
			return;
		}
		setSavingMedication(true);
		try {
			const payload = toCreateIds.map((id) => ({
				treatment_id: treatment.id,
				treatmentId: treatment.id,
				medication_id: id,
			}));
			if (payload.length === 1) {
				await treatmentMedicationService.createTreatmentMedication(
					payload[0] as any,
				);
			} else {
				await (treatmentMedicationService as any).createBulk(payload as any);
			}
			await treatmentMedicationService.clearCache();
			setTimeout(() => {
				refreshAssociations(treatment.id, true, "medications");
			}, 1200);

			setShowAddMedication(false);
			setNewMedications([]);
			const names = toCreateIds.map(
				(id) => medicationLabelById.get(Number(id)) || `#${id}`,
			);
			showToast(`Medicamento(s) asociados: ${names.join(", ")}`, "success");
		} catch (err: any) {
			setNewMedicationError("No se pudo añadir el medicamento al tratamiento.");
		} finally {
			setSavingMedication(false);
		}
	};

	const confirmDeleteVaccine = async (v: any) => {
		if (!v || !treatment) return;
		const itemId = v.id;
		setDeleteLoadingId({ type: "vaccine", id: itemId });
		setVaccines((prev) => prev.filter((v) => v.id !== itemId));

		try {
			await (treatmentVaccinesService as any).deleteTreatmentVaccine(
				String(itemId),
			);
			await treatmentVaccinesService.clearCache();
			await refreshAssociations(treatment.id, true, "vaccines", true);
			showToast("Vacuna desvinculada", "success");
		} catch (e: any) {
			if (e?.response?.status === 404 || e?.status === 404) {
				devLogger.warn("Item fantasma detectado (404), limpiando caché...");
				await treatmentVaccinesService.clearCache();
				await refreshAssociations(treatment.id, true, "vaccines", true);
			} else {
				await refreshAssociations(treatment.id, true, "vaccines");
				showToast("Error al desvincular vacuna", "error");
			}
		} finally {
			setDeleteLoadingId(null);
		}
	};

	const openDeleteVaccine = async (v: any) => {
		const itemId = v.id;
		if (confirmingDeleteId === itemId) {
			setConfirmingDeleteId(null);
			await confirmDeleteVaccine(v);
		} else {
			setConfirmingDeleteId(itemId);
			showToast("Haz clic de nuevo para desvincular", "warning");
			setTimeout(
				() => setConfirmingDeleteId((prev) => (prev === itemId ? null : prev)),
				3000,
			);
		}
	};

	const confirmDeleteMedication = async (m: any) => {
		if (!m || !treatment) return;
		const itemId = m.id;
		setDeleteLoadingId({ type: "medication", id: itemId });
		setMedications((prev) => prev.filter((m) => m.id !== itemId));

		try {
			await (treatmentMedicationService as any).deleteTreatmentMedication(
				String(itemId),
			);
			await treatmentMedicationService.clearCache();
			await refreshAssociations(treatment.id, true, "medications", true);
			showToast("Medicamento desvinculado", "success");
		} catch (e: any) {
			if (e?.response?.status === 404 || e?.status === 404) {
				devLogger.warn("Item fantasma detectado (404), limpiando caché...");
				await treatmentMedicationService.clearCache();
				await refreshAssociations(treatment.id, true, "medications", true);
			} else {
				await refreshAssociations(treatment.id, true, "medications");
				showToast("Error al desvincular medicamento", "error");
			}
		} finally {
			setDeleteLoadingId(null);
		}
	};

	const openDeleteMedication = async (m: any) => {
		const itemId = m.id;
		if (confirmingDeleteId === itemId) {
			setConfirmingDeleteId(null);
			await confirmDeleteMedication(m);
		} else {
			setConfirmingDeleteId(itemId);
			showToast("Haz clic de nuevo para desvincular", "warning");
			setTimeout(
				() => setConfirmingDeleteId((prev) => (prev === itemId ? null : prev)),
				3000,
			);
		}
	};

	const handleViewItem = (type: "vaccine" | "medication", id: number) => {
		if (!id) return;

		let itemData: any = null;
		if (type === "vaccine") {
			itemData = vaccineFullMap[id];
		} else {
			itemData = medicationFullMap[id];
		}

		if (itemData) {
			setViewDetailType(type);
			setViewDetailItem(itemData);
		} else {
			setViewDetailType(type);
			setViewDetailItem({
				id,
				name: type === "vaccine" ? `Vacuna #${id}` : `Medicamento #${id}`,
				_notFound: true,
			});
			showToast(
				"Los datos completos no están disponibles. Mostrando información básica.",
				"warning",
			);
		}
	};

	// Constant lists, sorting and pagination
	const sortedVaccines = useMemo(() => {
		const arr = [...(vaccines || [])];
		arr.sort((a: any, b: any) => {
			const ad = a.updated_at || a.created_at || "";
			const bd = b.updated_at || b.created_at || "";
			if (ad && bd) {
				const diff =
					new Date(ad as string).getTime() - new Date(bd as string).getTime();
				return -diff; // 'recent' sort
			}
			return 0;
		});
		return arr;
	}, [vaccines]);

	const sortedMedications = useMemo(() => {
		const arr = [...(medications || [])];
		arr.sort((a: any, b: any) => {
			const ad = a.updated_at || a.created_at || "";
			const bd = b.updated_at || b.created_at || "";
			if (ad && bd) {
				const diff =
					new Date(ad as string).getTime() - new Date(bd as string).getTime();
				return -diff; // 'recent' sort
			}
			return 0;
		});
		return arr;
	}, [medications]);

	const paginatedVaccines = useMemo(
		() => sortedVaccines.slice(0, 5),
		[sortedVaccines],
	);
	const paginatedMedications = useMemo(
		() => sortedMedications.slice(0, 5),
		[sortedMedications],
	);

	return {
		// Data states
		vaccines,
		medications,
		loadingVaccines,
		loadingMedications,
		vaccineOptions,
		medicationOptions,
		vaccineDoseMap,
		vaccineRouteMap,
		vaccineFullMap,
		medicationFullMap,
		viewDetailItem,
		setViewDetailItem,
		viewDetailType,
		setViewDetailType,
		showAddVaccine,
		setShowAddVaccine,
		showAddMedication,
		setShowAddMedication,
		vaccineSearch,
		setVaccineSearch,
		medicationSearch,
		setMedicationSearch,
		newVaccines,
		setNewVaccines,
		newMedications,
		setNewMedications,
		savingVaccine,
		savingMedication,
		newVaccineError,
		newMedicationError,
		confirmingDeleteId,
		deleteLoadingId,

		// Derived states
		paginatedVaccines,
		paginatedMedications,
		vaccineLabelById,
		medicationLabelById,

		// Actions
		refreshAssociations,
		handleCreateVaccine,
		handleCreateMedication,
		openDeleteVaccine,
		openDeleteMedication,
		handleViewItem,
	};
};
