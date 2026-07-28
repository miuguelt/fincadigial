import { AnimalLink } from "@/entities/animal/ui";
import type {
	RecommendationStatus,
	TreatmentRecommendation,
	TreatmentRecommendationInput,
} from "@/entities/treatment-recommendation/model/types";
import type { AnimalResponse } from "@/shared/api/generated/swaggerTypes";
import type { CRUDColumn, CRUDFormSection } from "@/shared/types/crud";
import { getTodayColombia } from "@/shared/utils/dateUtils";

const formatDate = (value?: string | null): string =>
	value
		? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO")
		: "Sin fecha definida";

const statusOptions: Array<{ value: RecommendationStatus; label: string }> = [
	{ value: "en_curso", label: "En curso" },
	{ value: "completado", label: "Completado" },
	{ value: "suspendido", label: "Suspendido" },
];

export const buildRecommendationColumns = (
	animalMap: Map<number, string>,
): CRUDColumn<TreatmentRecommendation>[] => [
	{
		key: "animal_id",
		label: "Animal",
		sortable: true,
		render: (value) => {
			const id = Number(value);
			return <AnimalLink id={id} label={animalMap.get(id) || `Animal ${id}`} />;
		},
	},
	{
		key: "title",
		label: "Título / Recomendación",
		sortable: true,
		render: (_value, item) => (
			<div className="min-w-[180px] max-w-[300px]">
				<p className="font-semibold">{item.title}</p>
				<p
					className="truncate text-xs text-muted-foreground"
					title={item.recommendation}
				>
					{item.recommendation}
				</p>
			</div>
		),
	},
	{
		key: "start_date",
		label: "Fecha inicio",
		sortable: true,
		render: (value) => formatDate(value),
	},
	{
		key: "next_control",
		label: "Próximo control",
		render: (_value, item) =>
			item.next_control
				? formatDate(item.next_control.scheduled_date)
				: "Sin control pendiente",
	},
	{
		key: "status",
		label: "Estado",
		sortable: true,
		render: (value) => (
			<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
				{statusOptions.find((option) => option.value === value)?.label ||
					"Estado registrado"}
			</span>
		),
	},
];

export const recommendationFormSections = (
	animalOptions: Array<{ value: number; label: string }>,
): CRUDFormSection<TreatmentRecommendationInput>[] => [
	{
		title: "Recomendación veterinaria",
		gridCols: 2,
		fields: [
			{
				name: "animal_id",
				label: "Animal",
				type: "select",
				required: true,
				options: animalOptions,
				placeholder: "Seleccionar animal",
			},
			{
				name: "title",
				label: "Título",
				type: "text",
				required: true,
				placeholder: "Ej: Reposo por cojera",
			},
			{
				name: "recommendation",
				label: "Recomendación",
				type: "textarea",
				required: true,
				placeholder: "Escribe la indicación completa del veterinario",
				colSpan: 2,
			},
			{
				name: "responsible",
				label: "Responsable",
				type: "text",
				placeholder: "Nombre de quien indicó el manejo",
			},
			{
				name: "status",
				label: "Estado",
				type: "select",
				options: statusOptions,
				placeholder: "Seleccionar estado",
			},
			{
				name: "start_date",
				label: "Fecha de inicio",
				type: "date",
				required: true,
			},
			{
				name: "estimated_end_date",
				label: "Fin estimado",
				type: "date",
				helperText: "Puedes dejarlo vacío si indicas la duración.",
			},
			{
				name: "duration_days",
				label: "Duración (días)",
				type: "number",
				placeholder: "Ej: 14",
				helperText: "Se calcula automáticamente si defines el fin.",
			},
			{
				name: "control_interval_days",
				label: "Intervalo de control (días)",
				type: "number",
				required: true,
				placeholder: "Ej: 3",
			},
			{
				name: "final_notes",
				label: "Notas finales",
				type: "textarea",
				placeholder: "Registra observaciones al cerrar el manejo.",
				colSpan: 2,
			},
		],
	},
];

export const initialRecommendationForm = (): TreatmentRecommendationInput => ({
	animal_id: 0,
	title: "",
	recommendation: "",
	responsible: "",
	start_date: getTodayColombia(),
	estimated_end_date: "",
	duration_days: 7,
	control_interval_days: 3,
	status: "en_curso",
	final_notes: "",
});

export const mapRecommendationToForm = (
	item: TreatmentRecommendation,
): TreatmentRecommendationInput => ({
	animal_id: item.animal_id,
	title: item.title,
	recommendation: item.recommendation,
	responsible: item.responsible || "",
	start_date: item.start_date?.slice(0, 10) || "",
	estimated_end_date: item.estimated_end_date?.slice(0, 10) || "",
	duration_days: item.duration_days,
	control_interval_days: item.control_interval_days,
	status: item.status,
	final_notes: item.final_notes || "",
});

export const validateRecommendation = (
	data: TreatmentRecommendationInput,
): string | null => {
	if (!data.animal_id) return "El animal es obligatorio.";
	if (!data.title?.trim()) return "El título es obligatorio.";
	if (!data.recommendation?.trim()) return "La recomendación es obligatoria.";
	if (!data.start_date) return "La fecha de inicio es obligatoria.";
	if (!data.control_interval_days || Number(data.control_interval_days) < 1)
		return "El intervalo de control debe ser mayor que cero.";
	if (!data.duration_days && !data.estimated_end_date)
		return "Indica la duración o el fin estimado.";
	if (data.duration_days != null && Number(data.duration_days) < 1)
		return "La duración debe ser mayor que cero.";
	return null;
};

export type AnimalOption = Pick<AnimalResponse, "id" | "record">;
