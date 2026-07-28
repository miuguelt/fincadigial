import { useMemo } from "react";
import { getAnimalLabel } from "@/entities/animal/lib/animalHelpers";
import { useAnimals } from "@/entities/animal/model/useAnimals";
import { useAnimalDiseases } from "@/entities/animal-disease/model/useAnimalDiseases";
import { useAnimalFields } from "@/entities/animal-field/model/useAnimalFields";
import { useControls } from "@/entities/control/model/useControl";
import { useGeneticImprovements } from "@/entities/genetic-improvement/model/useGeneticImprovement";
import { useTreatment } from "@/entities/treatment/model/useTreatment";
import { safeArray } from "@/shared/utils/apiHelpers";

export interface UserActivity {
	id: string;
	date: string;
	type:
		| "animal_created"
		| "disease_treated"
		| "control_performed"
		| "treatment_applied"
		| "genetic_improvement"
		| "field_management";
	title: string;
	description: string;
	animalRecord?: string;
	status?: string;
	iconType: string;
}

interface UseUserHistoryDataParams {
	userIdentification: string | number;
}

export function useUserHistoryData({
	userIdentification,
}: UseUserHistoryDataParams) {
	const { animals } = useAnimals();
	const { animalDiseases } = useAnimalDiseases();
	const { animalFields } = useAnimalFields();
	const { treatments } = useTreatment();
	const { controls } = useControls();
	const { geneticImprovements } = useGeneticImprovements();

	const safeAnimals = safeArray(animals);
	const safeAnimalDiseases = safeArray(animalDiseases);
	const safeAnimalFields = safeArray(animalFields);
	const safeTreatments = safeArray(treatments);
	const safeControls = safeArray(controls);
	const safeGeneticImprovements = safeArray(geneticImprovements);

	const userAnimals = useMemo(
		() =>
			safeAnimals.filter(
				(a: any) => a?.user?.identification === userIdentification,
			),
		[safeAnimals, userIdentification],
	);

	const userDiseases = useMemo(
		() =>
			safeAnimalDiseases.filter(
				(d: any) => d?.instructor?.identification === userIdentification,
			),
		[safeAnimalDiseases, userIdentification],
	);

	const userFields = useMemo(
		() =>
			safeAnimalFields.filter(
				(f: any) => f?.animal?.user?.identification === userIdentification,
			),
		[safeAnimalFields, userIdentification],
	);

	const userTreatments = useMemo(
		() =>
			safeTreatments.filter(
				(t: any) => t?.animals?.user?.identification === userIdentification,
			),
		[safeTreatments, userIdentification],
	);

	const userControls = useMemo(
		() =>
			safeControls.filter(
				(c: any) => c?.animals?.user?.identification === userIdentification,
			),
		[safeControls, userIdentification],
	);

	const userGenetics = useMemo(
		() =>
			safeGeneticImprovements.filter(
				(g: any) => g?.user?.identification === userIdentification,
			),
		[safeGeneticImprovements, userIdentification],
	);

	const timelineActivities = useMemo<UserActivity[]>(() => {
		const activities: UserActivity[] = [];
		userAnimals.forEach((animal: any) =>
			activities.push({
				id: `animal-${animal.idAnimal}`,
				date: animal.birth_date,
				type: "animal_created",
				title: `Animal Registrado: ${getAnimalLabel(animal)}`,
				description: `${animal.breed?.name || "Sin raza"} - ${animal.gender} - Estado: ${animal.status}`,
				animalRecord: getAnimalLabel(animal),
				status: animal.status,
				iconType: "users",
			}),
		);
		userDiseases.forEach((d: any) =>
			activities.push({
				id: `disease-${d.id}`,
				date: d.diagnosis_date,
				type: "disease_treated",
				title: "Diagnóstico de Enfermedad",
				description: `${d.disease?.name} en animal ${getAnimalLabel(d.animal)}`,
				animalRecord: getAnimalLabel(d.animal),
				status: d.status ? "Activo" : "Inactivo",
				iconType: "stethoscope",
			}),
		);
		userControls.forEach((c: any) =>
			activities.push({
				id: `control-${c.id}`,
				date: c.checkup_date,
				type: "control_performed",
				title: "Control de Salud Realizado",
				description: `Estado: ${c.healt_status} - ${c.description}`,
				animalRecord: getAnimalLabel(c.animals),
				status: c.healt_status,
				iconType: "activity",
			}),
		);
		userTreatments.forEach((t: any) =>
			activities.push({
				id: `treatment-${t.id}`,
				date: t.treatment_date,
				type: "treatment_applied",
				title: "Tratamiento Aplicado",
				description: `${t.description} - Animal: ${getAnimalLabel(t.animals)}`,
				animalRecord: getAnimalLabel(t.animals),
				status: "Aplicado",
				iconType: "syringe",
			}),
		);
		userGenetics.forEach((g: any) =>
			activities.push({
				id: `genetic-${g.id}`,
				date: g.date,
				type: "genetic_improvement",
				title: "Mejora Genética",
				description: `${g.genetic_event_techique} - Animal: ${getAnimalLabel(g.animal)}`,
				animalRecord: getAnimalLabel(g.animal),
				status: "Completado",
				iconType: "sparkles",
			}),
		);
		userFields.forEach((f: any) =>
			activities.push({
				id: `field-${f.id}`,
				date: f.treatment_date,
				type: "field_management",
				title: "Gestión de Campo",
				description: `Animal ${getAnimalLabel(f.animal)} en ${f.field?.name}`,
				animalRecord: getAnimalLabel(f.animal),
				status: f.end_date ? "Completado" : "Activo",
				iconType: "map-pin",
			}),
		);
		return activities.sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);
	}, [
		userAnimals,
		userDiseases,
		userControls,
		userTreatments,
		userGenetics,
		userFields,
	]);

	const stats = useMemo(() => {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		return {
			totalActivities: timelineActivities.length,
			animalsManaged: userAnimals.length,
			diseasesHandled: userDiseases.length,
			controlsPerformed: userControls.length,
			treatmentsApplied: userTreatments.length,
			geneticImprovements: userGenetics.length,
			recentActivities: timelineActivities.filter(
				(a) => new Date(a.date) >= thirtyDaysAgo,
			).length,
		};
	}, [
		timelineActivities,
		userAnimals,
		userDiseases,
		userControls,
		userTreatments,
		userGenetics,
	]);

	const chartData = useMemo(
		() => ({
			labels: [
				"Animales",
				"Diagnósticos",
				"Controles",
				"Tratamientos",
				"Genética",
				"Potreros",
			],
			datasets: [
				{
					label: "Registros",
					data: [
						userAnimals.length,
						userDiseases.length,
						userControls.length,
						userTreatments.length,
						userGenetics.length,
						userFields.length,
					],
					backgroundColor: [
						"rgba(16,185,129,0.2)",
						"rgba(239,68,68,0.2)",
						"rgba(139,92,246,0.2)",
						"rgba(249,115,22,0.2)",
						"rgba(245,158,11,0.2)",
						"rgba(14,165,233,0.2)",
					],
					borderColor: [
						"rgb(16,185,129)",
						"rgb(239,68,68)",
						"rgb(139,92,246)",
						"rgb(249,115,22)",
						"rgb(245,158,11)",
						"rgb(14,165,233)",
					],
					borderWidth: 1.5,
					borderRadius: 6,
					barThickness: 20,
				},
			],
		}),
		[
			userAnimals,
			userDiseases,
			userControls,
			userTreatments,
			userGenetics,
			userFields,
		],
	);

	return {
		timelineActivities,
		stats,
		chartData,
		userAnimals,
		userDiseases,
		userControls,
		userTreatments,
		userGenetics,
		userFields,
	};
}
