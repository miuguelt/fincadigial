import { useEffect, useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalsService } from "@/entities/animal/api/animal.service";

export function useRecommendationAnimals() {
	const { showToast } = useToast();
	const [animalOptions, setAnimalOptions] = useState<
		Array<{ value: number; label: string }>
	>([]);
	const [loadingAnimals, setLoadingAnimals] = useState(true);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const result = await animalsService.getAnimals({
					limit: 1000,
					status: "Vivo",
				});
				if (mounted) {
					setAnimalOptions(
						(result || []).map((animal) => ({
							value: animal.id,
							label: animal.record,
						})),
					);
				}
			} catch {
				if (mounted) showToast("No fue posible cargar los animales.", "error");
			} finally {
				if (mounted) setLoadingAnimals(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [showToast]);

	return { animalOptions, loadingAnimals };
}
