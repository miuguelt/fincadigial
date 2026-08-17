import { useState } from "react";
import { useToast } from "@/app/providers/ToastContext";
import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { getTodayColombia } from "@/shared/utils/dateUtils";

export interface TransferSuccessData {
	animalName: string;
	targetFieldName: string;
	targetFieldOldCount: number;
	targetFieldNewCount: number;
}

interface TransferMeta {
	transferred_count?: number;
	skipped_count?: number;
	fields?: Array<{ id: number; animal_count?: number }>;
}

interface Options {
	animals: any[];
	fields: any[];
	onClose: () => void;
	onSuccess: () => void;
}

const emptyForm = () => ({ animalId: "", fieldId: "", date: getTodayColombia() });

/**
 * Traslado de un animal desde el panel del campesino: formulario, envío y
 * mensajes. Vive fuera del modal para que el componente solo dibuje.
 */
export function useCampesinoTransfer({ animals, fields, onClose, onSuccess }: Options) {
	const { showToast } = useToast();
	const { isOnline } = useOnlineStatus();
	const [saving, setSaving] = useState(false);
	const [successData, setSuccessData] = useState<TransferSuccessData | null>(null);
	const [form, setForm] = useState(emptyForm);

	const finish = () => {
		onSuccess();
		onClose();
		setForm(emptyForm());
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!form.animalId || !form.fieldId) {
			showToast("Seleccione animal y potrero de destino", "error");
			return;
		}

		setSaving(true);
		try {
			if (!isOnline) {
				await offlineQueue.enqueue("POST", "animal-fields", {
					animal_id: Number(form.animalId),
					field_id: Number(form.fieldId),
					assignment_date: form.date,
				});
				showToast("Traslado guardado sin señal. Se sincronizará pronto.", "success");
				finish();
				return;
			}

			const animalName =
				animals.find((a) => a.id === Number(form.animalId))?.record ??
				`Animal ${form.animalId}`;
			const targetField = fields.find((f) => f.id === Number(form.fieldId));
			const targetFieldName = targetField?.name ?? "el potrero seleccionado";
			const targetFieldOldCount = targetField?.animal_count ?? 0;

			const result = await animalFieldsService.bulkTransfer({
				animal_ids: [Number(form.animalId)],
				field_id: Number(form.fieldId),
				date: form.date,
			});

			if (!result.success) {
				showToast(result.message || "Error al registrar traslado", "error");
				return;
			}

			const meta = result.meta as TransferMeta | undefined;
			const transferredCount =
				meta?.transferred_count ??
				(Array.isArray(result.data) ? result.data.length : 0);
			const skippedCount = meta?.skipped_count ?? 0;

			if (transferredCount === 0 && skippedCount > 0) {
				showToast(
					`⚠️ El animal ya estaba en «${targetFieldName}». No se realizó ningún cambio — el conteo del potrero refleja su situación actual.`,
					"warning",
				);
				finish();
				return;
			}

			// Disparar evento global para que todos los componentes refresquen
			window.dispatchEvent(new CustomEvent("animal-fields:updated"));

			// El conteo nuevo lo manda el backend ya recalculado; sumar 1 al viejo
			// fallaba si otra persona había movido ganado a ese potrero mientras tanto.
			const reportedTarget = meta?.fields?.find(
				(f) => Number(f.id) === Number(form.fieldId),
			);
			setSuccessData({
				animalName,
				targetFieldName,
				targetFieldOldCount,
				targetFieldNewCount: reportedTarget?.animal_count ?? targetFieldOldCount + 1,
			});
			setForm(emptyForm());
		} catch {
			showToast("Error al registrar traslado", "error");
		} finally {
			setSaving(false);
		}
	};

	const closeSuccess = () => {
		setSuccessData(null);
		onSuccess();
		onClose();
	};

	const dismiss = () => {
		setSuccessData(null);
		onClose();
	};

	return { form, setForm, saving, successData, isOnline, submit, closeSuccess, dismiss };
}
