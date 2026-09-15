import type React from "react";
import { useMemo, useState } from "react";
import { ClipboardList, MapPin, CheckCircle2, Circle } from "lucide-react";

import { animalCarePlanService } from "@/entities/animal-care-plan/api/animalCarePlans.service";
import type { AnimalCarePlan } from "@/entities/animal-care-plan/model/types";
import type { CRUDConfig } from "@/shared/types/crud";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { AdminCRUDPage } from "@/widgets/admin-crud";
import { SanidadTabs } from "@/widgets/dashboard/treatments/SanidadTabs";
import { useRecommendationAnimals } from "@/widgets/treatment-recommendations/hooks/useRecommendationAnimals";
import {
	buildCarePlanColumns,
	carePlanFormSections,
	initialCarePlanForm,
	mapCarePlanToForm,
	PLAN_STATUSES,
	PLAN_TYPES,
	stageStatusLabel,
	validateCarePlan,
} from "@/widgets/animal-care-plans/carePlanConfig";

const formatDate = (value?: string | null): string =>
	value
		? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO")
		: "Sin fecha definida";

function CarePlanStages({ plan }: { plan: AnimalCarePlan }) {
	const stages = plan.stages || [];
	if (stages.length === 0) {
		return (
			<p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
				Sin etapas todavía: agrégalas desde el módulo de etapas de planes.
			</p>
		);
	}
	return (
		<div className="space-y-3">
			{stages.map((stage) => (
				<div
					key={stage.id}
					className="relative pl-8 before:absolute before:bottom-0 before:left-[11px] before:top-5 before:w-px before:bg-purple-200 last:before:hidden"
				>
					<div className="absolute left-0 top-1 z-10 rounded-full bg-background text-purple-600">
						{stage.completed ? (
							<CheckCircle2 className="h-6 w-6" />
						) : (
							<Circle className="h-6 w-6" />
						)}
					</div>
					<div className="rounded-xl border border-border/50 bg-background p-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="text-sm font-bold">
								{stage.stage_order}. {stage.stage_name}
							</p>
							<span className="text-xs font-semibold text-purple-700">
								{stageStatusLabel(stage)}
							</span>
						</div>
						{(stage.start_date || stage.due_date) && (
							<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
								<MapPin className="h-3 w-3" />
								{stage.start_date ? `Programada: ${formatDate(stage.start_date)}` : ""}
								{stage.due_date ? ` → ${formatDate(stage.due_date)}` : ""}
							</p>
						)}
						{stage.observation && (
							<p className="mt-1 text-sm text-muted-foreground">{stage.observation}</p>
						)}
						{stage.completed && stage.fulfilled_kind && (
							<p className="mt-1 text-xs font-semibold text-emerald-700">
								Acto: {stage.fulfilled_kind} #{stage.fulfilled_ref_id}
							</p>
						)}
					</div>
				</div>
			))}
		</div>
	);
}

const AdminCarePlansPage: React.FC = () => {
	const { animalOptions, loadingAnimals } = useRecommendationAnimals();
	const [selected, setSelected] = useState<AnimalCarePlan | null>(null);

	const animalMap = useMemo(
		() => new Map((animalOptions || []).map((option) => [option.value, option.label])),
		[animalOptions],
	);

	const config = useMemo<
		CRUDConfig<
			AnimalCarePlan,
			ReturnType<typeof initialCarePlanForm>
		>
	>(
		() => ({
			title: "Planes de manejo por animal",
			headerDescription: "Articula sanidad, reproducción y nutrición en cada seguimiento",
			entityName: "Plan de manejo",
			columns: buildCarePlanColumns(animalMap),
			formSections: carePlanFormSections(animalOptions || []),
			searchPlaceholder: "Buscar por nombre, animal o descripción...",
			emptyStateMessage: "No hay planes de manejo registrados.",
			emptyStateDescription:
				"Crea un plan para articular sanidad, reproducción y nutrición de un animal en un solo seguimiento.",
			enableDetailModal: true,
			enableCreateModal: true,
			enableEditModal: true,
			enableDelete: true,
			showDetailTimestamps: false,
			showEditTimestamps: false,
			showIdInDetailTitle: false,
			themeColor: "purple",
			customHeader: <SanidadTabs />,
		}),
		[animalMap, animalOptions],
	);

	if (loadingAnimals)
		return (
			<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
				Cargando animales...
			</div>
		);

	return (
		<>
			<AdminCRUDPage
				config={config}
				service={animalCarePlanService}
				initialFormData={initialCarePlanForm()}
				mapResponseToForm={mapCarePlanToForm}
				validateForm={validateCarePlan}
				onOpenDetail={setSelected}
				realtime={true}
				pollIntervalMs={0}
				refetchOnFocus={false}
				refetchOnReconnect={true}
			/>
			<GenericModal
				isOpen={Boolean(selected)}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
				title="Detalle del plan de manejo"
				subtitle={
					selected?.animal?.record ||
					(selected ? `Animal ${selected.animal_id}` : undefined)
				}
				size="5xl"
				allowFullScreenToggle
				fullWidth
				themeColor="purple"
				icon={<ClipboardList aria-hidden="true" className="h-5 w-5" />}
			>
				{selected && (
					<div className="space-y-5 pb-2">
						<div className="rounded-xl border border-purple-200/60 bg-purple-50/20 p-4 dark:bg-purple-950/10">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<h3 className="text-lg font-bold">{selected.name}</h3>
								<div className="flex gap-2">
									<span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
										{PLAN_TYPES.find((option) => option.value === selected.plan_type)
											?.label || selected.plan_type}
									</span>
									<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
										{PLAN_STATUSES.find((option) => option.value === selected.status)
											?.label || selected.status}
									</span>
								</div>
							</div>
							{selected.description && (
								<p className="mt-2 whitespace-pre-wrap text-sm leading-6">
									{selected.description}
								</p>
							)}
							<p className="mt-2 text-sm text-muted-foreground">
								{formatDate(selected.start_date)} → {formatDate(selected.end_date)}
							</p>
							{selected.notes && (
								<p className="mt-2 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
									<span className="font-semibold">Notas:</span> {selected.notes}
								</p>
							)}
						</div>
						<section aria-labelledby="care-plan-stages-title">
							<div className="mb-3 flex items-center gap-2">
								<ClipboardList className="h-5 w-5 text-purple-600" />
								<h3 id="care-plan-stages-title" className="text-base font-bold">
									Etapas del plan
								</h3>
							</div>
							<CarePlanStages plan={selected} />
						</section>
					</div>
				)}
			</GenericModal>
		</>
	);
};

export default AdminCarePlansPage;
