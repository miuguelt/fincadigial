import { useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { devLogger } from "@/shared/utils/devLogger";

export interface QuickAnimalTransferInput {
	animalId: number;
	fieldId: number;
	date: string;
	animalLabel: string;
	fieldLabel: string;
}

export function useQuickAnimalTransfer(onSuccess: () => void) {
	const { showToast } = useToast();
	const { isOnline } = useOnlineStatus();
	const [submitting, setSubmitting] = useState(false);

	const submit = async (input: QuickAnimalTransferInput) => {
		setSubmitting(true);
		try {
			if (!isOnline) {
				await offlineQueue.enqueue("POST", "animal-fields/transfer", {
					animal_ids: [input.animalId],
					field_id: input.fieldId,
					date: input.date,
				});
				showToast(
					"Guardado en este teléfono. Lo enviaremos cuando vuelva la señal.",
					"success",
				);
				onSuccess();
				return;
			}

			const result = await animalFieldsService.bulkTransfer({
				animal_ids: [input.animalId],
				field_id: input.fieldId,
				date: input.date,
			});
			if (!result.success) {
				showToast(result.message || "No se pudo guardar el traslado.", "error");
				return;
			}

			const meta = result.meta ?? {};
			const transferred = Number(
				meta.transferred_count ?? meta.transferredCount ?? result.data.length,
			);
			const message =
				transferred > 0
					? `Listo. ${input.animalLabel} quedó registrado en ${input.fieldLabel}.`
					: `No se hizo ningún cambio: ${input.animalLabel} ya estaba en ${input.fieldLabel}.`;
			showToast(message, transferred > 0 ? "success" : "warning");
			window.dispatchEvent(new CustomEvent("animal-fields:updated"));
			onSuccess();
		} catch (error) {
			devLogger.error("Error al guardar el traslado", error);
			showToast("No se pudo guardar el traslado. Intente de nuevo.", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return { submit, submitting };
}
