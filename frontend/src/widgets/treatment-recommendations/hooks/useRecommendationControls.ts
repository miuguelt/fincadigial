import { useCallback, useEffect, useState } from "react";
import { treatmentRecommendationsService } from "@/entities/treatment-recommendation/api/treatmentRecommendations.service";
import type {
	TreatmentRecommendationControl,
	TreatmentRecommendationControlUpdate,
} from "@/entities/treatment-recommendation/model/types";

export function useRecommendationControls(recommendationId?: number) {
	const [controls, setControls] = useState<TreatmentRecommendationControl[]>(
		[],
	);
	const [loading, setLoading] = useState(false);
	const [savingControlId, setSavingControlId] = useState<number | null>(null);

	const loadControls = useCallback(async () => {
		if (!recommendationId) return;
		setLoading(true);
		try {
			const data =
				await treatmentRecommendationsService.getControls(recommendationId);
			setControls(Array.isArray(data) ? data : []);
		} finally {
			setLoading(false);
		}
	}, [recommendationId]);

	useEffect(() => {
		void loadControls();
	}, [loadControls]);

	const updateControl = useCallback(
		async (controlId: number, data: TreatmentRecommendationControlUpdate) => {
			if (!recommendationId) return;
			setSavingControlId(controlId);
			try {
				const updated = await treatmentRecommendationsService.updateControl(
					recommendationId,
					controlId,
					data,
				);
				setControls((current) =>
					current.map((control) =>
						control.id === controlId ? updated : control,
					),
				);
			} finally {
				setSavingControlId(null);
			}
		},
		[recommendationId],
	);

	return { controls, loading, savingControlId, updateControl };
}
