import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalsService } from "@/entities/animal/api/animal.service";
import { animalDiseasesService } from "@/entities/animal-disease/api/animalDiseases.service";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { diseaseService } from "@/entities/disease/api/disease.service";
import { fieldService } from "@/entities/field/api/field.service";
import { medicationsService } from "@/entities/medication/api/medications.service";
import { milkService } from "@/entities/milk/api/milk.service";
import { treatmentsService } from "@/entities/treatment/api/treatments.service";
import { devLogger } from "@/shared/utils/devLogger";
import type { RecordType, UnifiedRecord } from "../types";

export function useGanaderiaOperativa() {
	const { showToast } = useToast();

	// Master data
	const [animals, setAnimals] = useState<any[]>([]);
	const [fields, setFields] = useState<any[]>([]);
	const [diseases, setDiseases] = useState<any[]>([]);
	const [medications, setMedications] = useState<any[]>([]);
	const [loadingMaster, setLoadingMaster] = useState(true);

	// History data
	const [records, setRecords] = useState<UnifiedRecord[]>([]);
	const [loadingHistory, setLoadingHistory] = useState(true);

	// Filters
	const [searchTerm, setSearchTerm] = useState("");
	const [filterType, setFilterType] = useState<RecordType>("all");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	// 1. Fetch master data
	const loadMasterData = useCallback(async () => {
		setLoadingMaster(true);
		try {
			const [animalsResp, fieldsResp, diseasesResp, medsResp] =
				await Promise.all([
					animalsService.getAnimals({ limit: 300, status: "Vivo" }),
					fieldService.getFields({ limit: 100 }),
					diseaseService.getDiseases({ limit: 100 }),
					medicationsService.getMedications({ limit: 100 }),
				]);

			setAnimals(
				Array.isArray(animalsResp)
					? animalsResp
					: (animalsResp as any)?.data || [],
			);
			setFields(
				Array.isArray(fieldsResp)
					? fieldsResp
					: (fieldsResp as any)?.data || [],
			);
			setDiseases(
				Array.isArray(diseasesResp)
					? diseasesResp
					: (diseasesResp as any)?.data || [],
			);
			setMedications(
				Array.isArray(medsResp) ? medsResp : (medsResp as any)?.data || [],
			);
		} catch (e) {
			devLogger.error("Error loading master data:", e);
			showToast("Error al cargar datos del ganado", "error");
		} finally {
			setLoadingMaster(false);
		}
	}, [showToast]);

	// 2. Fetch history records and unify them
	const loadHistoryRecords = useCallback(async () => {
		setLoadingHistory(true);
		try {
			const [milkResp, fieldsAssResp, diseasesAssResp, treatmentsResp] =
				await Promise.all([
					milkService.getAll({ limit: 100, sort_by: "date", order: "desc" }),
					animalFieldsService.getAll({
						limit: 100,
						sort_by: "assignment_date",
						order: "desc",
					}),
					animalDiseasesService.getAll({
						limit: 100,
						sort_by: "diagnosis_date",
						order: "desc",
					}),
					treatmentsService.getAll({
						limit: 100,
						sort_by: "treatment_date",
						order: "desc",
					}),
				]);

			const unified: UnifiedRecord[] = [];

			const animalMap = new Map(animals.map((a) => [a.id, a]));
			const fieldMap = new Map(fields.map((f) => [f.id, f]));
			const diseaseMap = new Map(diseases.map((d) => [d.id, d]));
			const medMap = new Map(medications.map((m) => [m.id, m]));

			const getAnimalName = (id: number) => {
				const a = animalMap.get(id);
				return a
					? `${a.record} - ${a.breed?.name || "Sin Raza"}`
					: `Animal ${id}`;
			};

			if (Array.isArray(milkResp)) {
				milkResp.forEach((m: any) => {
					const shift =
						m.milking_session === "AM"
							? "Mañana"
							: m.milking_session === "PM"
								? "Tarde"
								: "Total";
					unified.push({
						id: `milking-${m.id}`,
						type: "milking",
						date: m.date,
						animalId: m.animal_id,
						animalLabel: getAnimalName(m.animal_id),
						details: `${m.liters} Litros (${shift})`,
						notes: m.notes,
						raw: m,
					});
				});
			}

			if (Array.isArray(fieldsAssResp)) {
				fieldsAssResp.forEach((tf: any) => {
					const field = fieldMap.get(tf.field_id);
					const fName = field ? field.name : `Campo ${tf.field_id}`;
					unified.push({
						id: `transfer-${tf.id}`,
						type: "transfer",
						date: tf.assignment_date,
						animalId: tf.animal_id,
						animalLabel: getAnimalName(tf.animal_id),
						entityId: tf.field_id,
						entityLabel: fName,
						details: `Trasladado a Potrero: ${fName}`,
						notes: tf.notes,
						raw: tf,
					});
				});
			}

			if (Array.isArray(diseasesAssResp)) {
				diseasesAssResp.forEach((da: any) => {
					const d = diseaseMap.get(da.disease_id);
					const dName = d ? d.name : `Enfermedad ${da.disease_id}`;
					unified.push({
						id: `disease-${da.id}`,
						type: "disease",
						date: da.diagnosis_date,
						animalId: da.animal_id,
						animalLabel: getAnimalName(da.animal_id),
						entityId: da.disease_id,
						entityLabel: dName,
						details: `Enfermedad: ${dName} (${da.status || "Activo"})`,
						notes: da.notes,
						raw: da,
					});
				});
			}

			if (Array.isArray(treatmentsResp)) {
				treatmentsResp.forEach((t: any) => {
					const med = medMap.get(t.medication_id);
					const mName = med ? med.name : `Medicamento ${t.medication_id}`;
					unified.push({
						id: `treatment-${t.id}`,
						type: "treatment",
						date: t.treatment_date,
						animalId: t.animal_id,
						animalLabel: getAnimalName(t.animal_id),
						entityId: t.medication_id,
						entityLabel: mName,
						details: `Tratamiento: ${mName} (${t.dosis || t.dose || "Sin dosis"})`,
						notes: t.notes || t.description,
						raw: t,
					});
				});
			}

			unified.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
			);
			setRecords(unified);
		} catch (e) {
			devLogger.error("Error loading history records:", e);
			showToast("Error al cargar historial operativo", "error");
		} finally {
			setLoadingHistory(false);
		}
	}, [animals, fields, diseases, medications, showToast]);

	useEffect(() => {
		loadMasterData();
	}, [loadMasterData]);

	useEffect(() => {
		if (!loadingMaster) {
			loadHistoryRecords();
		}
	}, [loadingMaster, loadHistoryRecords]);

	// Escuchar evento global de traslado para refrescar potreros (conteo animal_count)
	useEffect(() => {
		const handleFieldUpdate = () => {
			// Usar cache_bust=Date.now() para saltar TODAS las capas de cache
			// (BaseService + Axios HTTP cache) y forzar datos frescos del servidor
			(fieldService as any)
				.getFields({ limit: 200, cache_bust: Date.now() })
				.then((resp: any) => {
					const fresh = Array.isArray(resp) ? resp : resp?.data || [];
					if (fresh.length > 0) setFields(fresh);
				})
				.catch(() => {});
		};
		window.addEventListener("animal-fields:updated", handleFieldUpdate);
		return () =>
			window.removeEventListener("animal-fields:updated", handleFieldUpdate);
	}, []);

	const filteredRecords = useMemo(() => {
		return records.filter((r) => {
			if (filterType !== "all" && r.type !== filterType) return false;

			if (searchTerm.trim()) {
				const term = searchTerm.toLowerCase();
				const matchesAnimal = r.animalLabel.toLowerCase().includes(term);
				const matchesDetails = r.details.toLowerCase().includes(term);
				const matchesNotes = r.notes
					? r.notes.toLowerCase().includes(term)
					: false;
				if (!matchesAnimal && !matchesDetails && !matchesNotes) return false;
			}

			if (startDate && new Date(r.date) < new Date(startDate)) return false;
			if (endDate && new Date(r.date) > new Date(endDate)) return false;

			return true;
		});
	}, [records, filterType, searchTerm, startDate, endDate]);

	const stats = useMemo(() => {
		let milkTotal = 0;
		let activeDiseases = 0;
		let transfersCount = 0;
		let treatmentsCount = 0;

		records.forEach((r) => {
			if (r.type === "milking") {
				milkTotal += r.raw.liters || 0;
			} else if (r.type === "disease" && r.raw.status === "Activo") {
				activeDiseases++;
			} else if (r.type === "transfer") {
				transfersCount++;
			} else if (r.type === "treatment") {
				treatmentsCount++;
			}
		});

		return {
			milkTotal: Math.round(milkTotal * 10) / 10,
			activeDiseases,
			transfersCount,
			treatmentsCount,
		};
	}, [records]);

	const clearFilters = () => {
		setSearchTerm("");
		setFilterType("all");
		setStartDate("");
		setEndDate("");
	};

	return {
		animals,
		fields,
		diseases,
		medications,
		loadingMaster,
		records,
		filteredRecords,
		loadingHistory,
		stats,
		filters: {
			searchTerm,
			setSearchTerm,
			filterType,
			setFilterType,
			startDate,
			setStartDate,
			endDate,
			setEndDate,
			clearFilters,
		},
		refreshHistory: loadHistoryRecords,
	};
}
