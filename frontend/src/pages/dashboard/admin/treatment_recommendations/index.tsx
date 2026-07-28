import type React from "react";
import { useMemo, useState } from "react";
import { treatmentRecommendationsService } from "@/entities/treatment-recommendation/api/treatmentRecommendations.service";
import type { TreatmentRecommendation } from "@/entities/treatment-recommendation/model/types";
import type { CRUDConfig } from "@/shared/types/crud";
import { GenericModal } from "@/shared/ui/common/GenericModal";
import { AdminCRUDPage } from "@/widgets/admin-crud";
import { SanidadTabs } from "@/widgets/dashboard/treatments/SanidadTabs";
import { RecommendationDetail } from "@/widgets/treatment-recommendations";
import { useRecommendationAnimals } from "@/widgets/treatment-recommendations/hooks/useRecommendationAnimals";
import {
	buildRecommendationColumns,
	initialRecommendationForm,
	mapRecommendationToForm,
	recommendationFormSections,
	validateRecommendation,
} from "@/widgets/treatment-recommendations/recommendationConfig";

const AdminTreatmentRecommendationsPage: React.FC = () => {
	const { animalOptions, loadingAnimals } = useRecommendationAnimals();
	const [selected, setSelected] = useState<TreatmentRecommendation | null>(
		null,
	);

	const animalMap = useMemo(
		() => new Map((animalOptions || []).map((option) => [option.value, option.label])),
		[animalOptions],
	);
	const config = useMemo<
		CRUDConfig<
			TreatmentRecommendation,
			ReturnType<typeof initialRecommendationForm>
		>
	>(
		() => ({
			title: "Recomendaciones y manejo veterinario",
			entityName: "Recomendación veterinaria",
			columns: buildRecommendationColumns(animalMap),
			formSections: recommendationFormSections(animalOptions || []),
			searchPlaceholder: "Buscar por título o recomendación...",
			emptyStateMessage: "No hay recomendaciones veterinarias registradas.",
			emptyStateDescription:
				"Crea una recomendación para iniciar el seguimiento de un animal.",
			enableDetailModal: true,
			enableCreateModal: true,
			enableEditModal: true,
			enableDelete: true,
			showDetailTimestamps: false,
			showEditTimestamps: false,
			showIdInDetailTitle: false,
			themeColor: "emerald",
			customHeader: (
				<div className="w-full mt-4">
					<SanidadTabs />
				</div>
			),
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
				service={treatmentRecommendationsService}
				initialFormData={initialRecommendationForm()}
				mapResponseToForm={mapRecommendationToForm}
				validateForm={validateRecommendation}
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
				title="Detalle de la recomendación veterinaria"
				subtitle={
					selected?.animal?.record ||
					(selected ? `Animal ${selected.animal_id}` : undefined)
				}
				size="5xl"
				allowFullScreenToggle
				fullWidth
				themeColor="emerald"
				icon={<span aria-hidden="true">✓</span>}
			>
				{selected && <RecommendationDetail item={selected} />}
			</GenericModal>
		</>
	);
};

export default AdminTreatmentRecommendationsPage;
