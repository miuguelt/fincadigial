import { AnimalLink } from "@/entities/animal/ui";
import type {
	AnimalCarePlan,
	AnimalCarePlanInput,
	CarePlanStatus,
	CarePlanType,
} from "@/entities/animal-care-plan/model/types";
import type { CRUDColumn, CRUDFormSection } from "@/shared/types/crud";
import { getTodayColombia } from "@/shared/utils/dateUtils";

const formatDate = (value?: string | null): string =>
	value
		? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO")
		: "Sin fecha definida";

export const PLAN_TYPES: Array<{ value: CarePlanType; label: string }> = [
	{ value: "Sanitario", label: "Sanitario" },
	{ value: "Reproductivo", label: "Reproductivo" },
	{ value: "Nutricional", label: "Nutricional" },
	{ value: "Manejo General", label: "Manejo general" },
	{ value: "Preventivo", label: "Preventivo" },
];

export const PLAN_STATUSES: Array<{ value: CarePlanStatus; label: string }> = [
	{ value: "Borrador", label: "Borrador" },
	{ value: "Activo", label: "Activo" },
	{ value: "Completado", label: "Completado" },
	{ value: "Cancelado", label: "Cancelado" },
];

const statusBadgeClass: Record<CarePlanStatus, string> = {
	Borrador: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
	Activo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
	Completado: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
	Cancelado: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
};

export const buildCarePlanColumns = (
	animalMap: Map<number, string>,
): CRUDColumn<AnimalCarePlan>[] => [
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
		key: "name",
		label: "Plan",
		sortable: true,
		render: (value, item) => (
			<div className="min-w-[160px]">
				<p className="font-semibold">{value}</p>
				{item.description && (
					<p className="fit-clamp text-xs text-muted-foreground" title={item.description}>
						{item.description}
					</p>
				)}
			</div>
		),
	},
	{
		key: "plan_type",
		label: "Tipo",
		sortable: true,
		render: (value) => (
			<span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
				{PLAN_TYPES.find((option) => option.value === value)?.label || value}
			</span>
		),
	},
	{
		key: "start_date",
		label: "Inicio",
		sortable: true,
		render: (value) => formatDate(value),
	},
	{
		key: "end_date",
		label: "Fin",
		sortable: true,
		render: (value) => formatDate(value),
	},
	{
		key: "status",
		label: "Estado",
		sortable: true,
		render: (value) => (
			<span
				className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass[value as CarePlanStatus] || ""}`}
			>
				{PLAN_STATUSES.find((option) => option.value === value)?.label || value}
			</span>
		),
	},
];

export const carePlanFormSections = (
	animalOptions: Array<{ value: number; label: string }>,
): CRUDFormSection<AnimalCarePlanInput>[] => [
	{
		title: "Plan de manejo del animal",
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
				name: "name",
				label: "Nombre del plan",
				type: "text",
				required: true,
				placeholder: "Ej: Plan sanitario de reposición",
			},
			{
				name: "plan_type",
				label: "Tipo",
				type: "select",
				required: true,
				options: PLAN_TYPES,
				placeholder: "Seleccionar tipo",
			},
			{
				name: "status",
				label: "Estado",
				type: "select",
				options: PLAN_STATUSES,
				placeholder: "Seleccionar estado",
			},
			{
				name: "start_date",
				label: "Fecha de inicio",
				type: "date",
				required: true,
			},
			{
				name: "end_date",
				label: "Fecha de fin",
				type: "date",
				required: true,
			},
			{
				name: "description",
				label: "Descripción",
				type: "textarea",
				placeholder: "Objetivo y alcance del plan",
				colSpan: 2,
			},
			{
				name: "notes",
				label: "Notas",
				type: "textarea",
				placeholder: "Observaciones adicionales",
				colSpan: 2,
			},
		],
	},
];

export const initialCarePlanForm = (): AnimalCarePlanInput => ({
	animal_id: 0,
	plan_type: "Sanitario",
	status: "Borrador",
	name: "",
	description: "",
	start_date: getTodayColombia(),
	end_date: "",
	notes: "",
});

export const mapCarePlanToForm = (item: AnimalCarePlan): AnimalCarePlanInput => ({
	animal_id: item.animal_id,
	plan_type: item.plan_type,
	status: item.status,
	name: item.name,
	description: item.description || "",
	start_date: item.start_date?.slice(0, 10) || "",
	end_date: item.end_date?.slice(0, 10) || "",
	notes: item.notes || "",
});

export const validateCarePlan = (data: AnimalCarePlanInput): string | null => {
	if (!data.animal_id) return "El animal es obligatorio.";
	if (!data.name?.trim()) return "El nombre del plan es obligatorio.";
	if (!data.start_date) return "La fecha de inicio es obligatoria.";
	if (!data.end_date) return "La fecha de fin es obligatoria.";
	if (data.end_date < data.start_date)
		return "La fecha de fin no puede ser anterior al inicio.";
	return null;
};

export const stageStatusLabel = (stage: {
	completed: boolean;
	due_date?: string | null;
}): string => {
	if (stage.completed) return "Completada";
	return "Pendiente";
};
