import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/model/useAuth";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { toast } from "@/shared/hooks/use-toast";
import { devLogger } from "@/shared/utils/devLogger";
import { getErrorMessage, transferAnimal } from "./corralActions";
import type { TransferOutcome } from "./corralActions";
import { buildCorralPayload } from "./corralPayload";
import type { AnimalOption, HealthSelection, ReproductionEvent } from "./types";

interface UseCorralFormOptions {
	animals: AnimalOption[];
	isOnline: boolean;
	fetchHistory: () => Promise<void>;
	onClose?: () => void;
}

export function useCorralForm({
	animals,
	isOnline,
	fetchHistory,
	onClose,
}: UseCorralFormOptions) {
	const { user } = useAuth();
	const [animalId, setAnimalId] = useState<number | "">("");
	const [healthStatus, setHealthStatus] = useState<HealthSelection>("");
	const [weight, setWeight] = useState("");
	const [milkLiters, setMilkLiters] = useState("");
	const [showRepro, setShowRepro] = useState(false);
	const [reproEvent, setReproEvent] = useState<ReproductionEvent>("");
	const [showTreatment, setShowTreatment] = useState(false);
	const [treatmentDesc, setTreatmentDesc] = useState("");
	const [treatmentDosis, setTreatmentDosis] = useState("");
	const [treatmentFrequency, setTreatmentFrequency] = useState("");
	const [showTransfer, setShowTransfer] = useState(false);
	const [targetFieldId, setTargetFieldId] = useState<number | "">("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const selectedAnimal = animals.find((animal) => animal.value === animalId);
	const isFemale = selectedAnimal?.sex === "Hembra";
	const selectedAnimalSex = selectedAnimal?.sex;

	useEffect(() => {
		const needsTreatment =
			healthStatus === "Malo" || healthStatus === "Regular";
		setShowTreatment(needsTreatment);
		if (!needsTreatment) {
			setTreatmentDesc("");
			setTreatmentDosis("");
			setTreatmentFrequency("");
		}
	}, [healthStatus]);

	const selectAnimal = (id: number) => {
		setAnimalId(id);
		const animal = animals.find((option) => option.value === id);
		if (animal?.sex !== "Hembra") {
			setMilkLiters("");
			setShowRepro(false);
			setReproEvent("");
		}
	};

	const toggleReproduction = () => {
		setShowRepro((visible) => {
			if (visible) setReproEvent("");
			return !visible;
		});
	};

	const toggleTransfer = () => {
		setShowTransfer((visible) => {
			if (visible) setTargetFieldId("");
			return !visible;
		});
	};

	const resetForm = () => {
		setAnimalId("");
		setHealthStatus("");
		setWeight("");
		setMilkLiters("");
		setShowRepro(false);
		setReproEvent("");
		setShowTreatment(false);
		setTreatmentDesc("");
		setTreatmentDosis("");
		setTreatmentFrequency("");
		setShowTransfer(false);
		setTargetFieldId("");
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (animalId === "") {
			toast({
				title: "Falta escoger el animal",
				description: "Seleccione el animal antes de guardar.",
				variant: "warning",
			});
			return;
		}
		const payloadResult = buildCorralPayload({
			animalId,
			fincaId: user?.finca_id,
			healthStatus,
			weight,
			milkLiters,
			isFemale,
			showRepro,
			reproEvent,
			showTransfer,
			targetFieldId,
			showTreatment,
			treatmentDesc,
			treatmentDosis,
			treatmentFrequency,
		});
		if (payloadResult.error) {
			toast({
				...payloadResult.error,
				variant: "warning",
			});
			return;
		}
		const { payload } = payloadResult;

		setIsSubmitting(true);
		try {
			await offlineQueue.enqueue("POST", "/api/v1/corral/session", payload);
			let transferOutcome: TransferOutcome | undefined;
			if (showTransfer && targetFieldId) {
				transferOutcome = await transferAnimal({
					animalId,
					fieldId: Number(targetFieldId),
					isOnline,
				});
			}
			toast({
				title:
					transferOutcome && !transferOutcome.queued && !transferOutcome.changed
						? "Registro guardado sin traslado"
						: "Registro guardado",
				description:
					transferOutcome?.message ??
					(isOnline
						? "Los datos del animal quedaron guardados."
						: "Quedaron guardados en este equipo y se enviarán cuando vuelva la señal."),
				variant:
					transferOutcome && !transferOutcome.queued && !transferOutcome.changed
						? "warning"
						: "success",
			});
			if (onClose) {
				onClose();
				return;
			}
			resetForm();
			if (isOnline) await fetchHistory();
		} catch (error) {
			devLogger.error(error);
			toast({
				title: "No se pudo guardar",
				description: getErrorMessage(error),
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		animalId,
		healthStatus,
		isFemale,
		isSubmitting,
		milkLiters,
		reproEvent,
		selectedAnimalSex,
		showRepro,
		showTreatment,
		showTransfer,
		targetFieldId,
		treatmentDesc,
		treatmentDosis,
		treatmentFrequency,
		weight,
		handleSubmit,
		selectAnimal,
		setHealthStatus,
		setMilkLiters,
		setReproEvent,
		setTargetFieldId,
		setTreatmentDesc,
		setTreatmentDosis,
		setTreatmentFrequency,
		setWeight,
		toggleReproduction,
		toggleTransfer,
	};
}

export type CorralFormController = ReturnType<typeof useCorralForm>;
