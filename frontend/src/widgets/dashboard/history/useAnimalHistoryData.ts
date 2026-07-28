import { differenceInCalendarDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
	type AnimalMovementResponse,
	animalMovementsService,
} from "@/entities/animal/api/animalMovements.service";
import { useAnimalDiseases } from "@/entities/animal-disease/model/useAnimalDiseases";
import { useAnimalFields } from "@/entities/animal-field/model/useAnimalFields";
import { useControls } from "@/entities/control/model/useControl";
import { useTreatment } from "@/entities/treatment/model/useTreatment";
import { safeArray } from "@/shared/utils/apiHelpers";
import { devLogger } from "@/shared/utils/devLogger";

export interface TimelineEvent {
	id: string;
	date: string;
	type: "disease" | "treatment" | "control" | "movement";
	title: string;
	description: string;
	status?: string;
	icon: React.ReactNode;
	previewType?: "treatment" | "field" | "disease" | "control";
	previewData?: any;
	isVaccination?: boolean;
	dueDate?: string;
	dueStatus?: "due_soon" | "overdue" | "ok";
	dueInDays?: number;
	dueLabel?: string;
}

export interface DueInfo {
	status: "due_soon" | "overdue" | "ok";
	days: number;
	label: string;
}

export function getDueInfo(dueRaw?: string | null): DueInfo | null {
	if (!dueRaw) return null;
	try {
		const today = new Date();
		const d = new Date(dueRaw);
		const days = differenceInCalendarDays(d, today);
		if (Number.isNaN(days)) return null;
		if (days < 0)
			return {
				status: "overdue",
				days: Math.abs(days),
				label: `Vencido hace ${Math.abs(days)} días`,
			};
		if (days === 0) return { status: "due_soon", days, label: "Vence hoy" };
		if (days <= 14)
			return { status: "due_soon", days, label: `Vence en ${days} días` };
		return { status: "ok", days, label: `Vence en ${days} días` };
	} catch {
		return null;
	}
}

interface UseAnimalHistoryDataParams {
	animalId: number;
	refreshTrigger?: number;
}

export function useAnimalHistoryData({
	animalId,
	refreshTrigger,
}: UseAnimalHistoryDataParams) {
	const { data: animalDiseases, refetch: refetchDiseases } =
		useAnimalDiseases();
	const { data: animalFields, fetchAnimalFields: refetchFields } =
		useAnimalFields();
	const { data: treatments, refetch: refetchTreatments } = useTreatment();
	const { data: controls, refetch: refetchControls } = useControls();

	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyError, setHistoryError] = useState<string | null>(null);
	const [remoteHistory, setRemoteHistory] = useState<any | null>(null);
	const [movementsData, setMovementsData] = useState<AnimalMovementResponse[]>(
		[],
	);

	// Refresh on mount
	useEffect(() => {
		const refresh = async () => {
			try {
				await Promise.all([
					refetchDiseases?.(),
					refetchFields?.(),
					refetchTreatments?.(),
					refetchControls?.(),
				]);
			} catch (e) {
				devLogger.error("Error refreshing history data:", e);
			}
		};
		refresh();
	}, [refetchDiseases, refetchFields, refetchTreatments, refetchControls]);

	// Refresh on trigger change
	useEffect(() => {
		if (refreshTrigger !== undefined && refreshTrigger > 0) {
			refetchDiseases?.();
			refetchFields?.();
			refetchTreatments?.();
			refetchControls?.();
		}
	}, [
		refreshTrigger,
		refetchDiseases,
		refetchFields,
		refetchTreatments,
		refetchControls,
	]);

	// Load remote medical history and movements
	useEffect(() => {
		let active = true;
		const load = async () => {
			setHistoryLoading(true);
			setHistoryError(null);
			try {
				const { analyticsService } = await import(
					"@/features/reporting/api/analytics.service"
				);
				const [medicalData, movs] = await Promise.all([
					analyticsService.getAnimalMedicalHistory(animalId).catch(() => null),
					animalMovementsService
						.getAnimalMovements(animalId)
						.catch(() => [] as AnimalMovementResponse[]),
				]);
				if (active) {
					setRemoteHistory(medicalData);
					setMovementsData(movs || []);
				}
			} catch (e: any) {
				if (active)
					setHistoryError(e?.message || "Could not load remote history");
			} finally {
				if (active) setHistoryLoading(false);
			}
		};
		load();
		return () => {
			active = false;
		};
	}, [animalId, refreshTrigger]);

	// Filter by animal
	const belongsToAnimal = (item: any) => {
		const ids = [
			item?.animal_id,
			item?.animals?.id,
			item?.animal?.id,
			item?.animal?.idAnimal,
			item?.animals?.idAnimal,
		].filter((v) => v !== undefined && v !== null);
		return ids.some((id) => Number(id) === Number(animalId));
	};

	const animalDiseasesData = safeArray(animalDiseases).filter(belongsToAnimal);
	const animalFieldsData = safeArray(animalFields).filter(belongsToAnimal);
	const animalTreatmentsData = safeArray(treatments).filter(belongsToAnimal);
	const animalControlsData = safeArray(controls).filter(belongsToAnimal);

	// Build treatment rows
	const treatmentRows = useMemo(() => {
		const local = animalTreatmentsData.map((t: any) => ({
			date: t.treatment_date,
			type: "Tratamiento",
			description: t.description || "Tratamiento",
			dose: t.dosis || t.dose || "",
			frequency: t.frequency || "",
			status: t.status || "",
			veterinarian: t.veterinarian || "",
			cost: t.cost ?? "",
			notes: t.notes || "",
			plan: t.treatment_plan || "",
			follow_up_date: t.follow_up_date,
			treatment_type: t.treatment_type || "",
		}));
		const rhT = (
			remoteHistory?.treatments ||
			remoteHistory?.medical_treatments ||
			[]
		).map((t: any) => ({
			date: t.treatment_date,
			type: "Tratamiento",
			description: t.diagnosis || t.description || "Tratamiento",
			dose: t.dose || t.dosage || "",
			frequency: t.frequency || t.interval || "",
			status: t.status || "",
			veterinarian: t.veterinarian || "",
			cost: t.cost ?? "",
			notes: t.notes || "",
			plan: t.treatment_plan || "",
			follow_up_date: t.follow_up_date,
			treatment_type: t.treatment_type || "",
		}));
		const rhV = (remoteHistory?.vaccinations || []).map((v: any) => ({
			date: v.vaccination_date,
			type: "Vacunación",
			description: v.vaccine?.name || v.vaccine_name || "Vacunación",
			dose: v.dose || v.dosage || "",
			frequency: v.frequency || "",
			status: v.status || "",
			veterinarian: v.veterinarian || "",
			cost: "",
			notes: v.notes || "",
			plan: "",
			follow_up_date: v.next_vaccination_date || v.next_due_date,
			vaccine_name: v.vaccine?.name || v.vaccine_name,
			batch_number: v.batch_number || "",
			expiry_date: v.expiry_date || "",
			administration_route: v.administration_route || "",
			adverse_reactions: v.adverse_reactions || "",
			next_vaccination_date: v.next_vaccination_date || "",
			next_due_date: v.next_due_date || "",
			dose_volume: v.dose_volume || "",
			administered_by: v.administered_by || "",
		}));
		return [...local, ...rhT, ...rhV]
			.filter((r) => r.date)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	}, [animalTreatmentsData, remoteHistory]);

	// Build field rows
	const fieldRows = useMemo(() => {
		const rows = animalFieldsData.map((f: any) => {
			const assignment = f.assignment_date;
			const removal = f.removal_date;
			const endRef = removal ? new Date(removal) : new Date();
			const startRef = assignment ? new Date(assignment) : null;
			const duration_days = startRef
				? Math.max(
						0,
						Math.ceil(
							(endRef.getTime() - startRef.getTime()) / (1000 * 60 * 60 * 24),
						),
					)
				: "";
			return {
				field: f.field?.name || "Campo",
				assignment,
				removal,
				notes: f.reason || f.notes || "—",
				is_active: !!f.is_active && !removal,
				status: removal ? "Retirado" : "Asignado",
				duration_days,
			};
		});
		rows.sort(
			(a, b) =>
				new Date((b.assignment || b.removal || 0) as any).getTime() -
				new Date((a.assignment || a.removal || 0) as any).getTime(),
		);
		return rows;
	}, [animalFieldsData]);

	// Build disease rows
	const diseaseRows = useMemo(() => {
		const local = animalDiseasesData.map((d: any) => ({
			disease: d.disease?.name || "Enfermedad",
			start: d.treatment_date,
			treatment: d.treatment || "",
			status: d.status || "",
			severity: d.severity || "",
			notes: d.notes || "",
		}));
		const remote = [
			...(remoteHistory?.diseases || []),
			...(remoteHistory?.diagnoses || []),
		].map((d: any) => ({
			disease: d.disease?.name || d.disease_name || d.name || "Enfermedad",
			start: d.diagnosis_date || d.treatment_date,
			treatment: d.treatment || d.treatment_plan || "",
			status: d.status || "",
			severity: d.severity || "",
			notes: d.notes || d.symptoms || "",
		}));
		return [...local, ...remote]
			.filter((r) => r.start || r.disease)
			.sort(
				(a, b) =>
					new Date(b.start || 0).getTime() - new Date(a.start || 0).getTime(),
			);
	}, [animalDiseasesData, remoteHistory]);

	// Build control rows
	const controlRows = useMemo(() => {
		const local = animalControlsData.map((c: any) => ({
			date: c.checkup_date,
			status: c.healt_status || c.health_status || "",
			weight: c.weight ?? "",
			temperature: c.temperature ?? "",
			heart_rate: c.heart_rate ?? "",
			respiratory_rate: c.respiratory_rate ?? "",
			height: c.height ?? "",
			body_condition: c.body_condition ?? "",
			veterinarian: c.veterinarian || "",
			next_control_date: c.next_control_date || "",
			notes: c.description || c.observations || "",
		}));
		const remote = (
			remoteHistory?.controls ||
			remoteHistory?.health_checks ||
			[]
		).map((c: any) => ({
			date: c.control_date,
			status: c.health_status || c.status || "",
			weight: c.weight ?? "",
			temperature: c.temperature ?? "",
			heart_rate: c.heart_rate ?? "",
			respiratory_rate: c.respiratory_rate ?? "",
			height: c.height ?? "",
			body_condition: c.body_condition ?? "",
			veterinarian: c.veterinarian || "",
			next_control_date: c.next_control_date || "",
			notes: c.notes || c.description || "",
		}));
		return [...local, ...remote]
			.filter((r) => r.date)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	}, [animalControlsData, remoteHistory]);

	return {
		historyLoading,
		historyError,
		remoteHistory,
		animalDiseasesData,
		animalFieldsData,
		animalTreatmentsData,
		animalControlsData,
		treatmentRows,
		fieldRows,
		diseaseRows,
		controlRows,
		movementsData,
	};
}
