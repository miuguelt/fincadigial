import { animalFieldsService } from "@/entities/animal-field/api/animalFields.service";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { getTodayColombia } from "@/shared/utils/dateUtils";

interface TransferOptions {
	animalId: number;
	fieldId: number;
	isOnline: boolean;
}

interface TransferMeta {
	transferred_count?: number;
	skipped_count?: number;
}

export interface TransferOutcome {
	changed: boolean;
	queued: boolean;
	message: string;
}

export async function transferAnimal({
	animalId,
	fieldId,
	isOnline,
}: TransferOptions): Promise<TransferOutcome> {
	const data = {
		animal_ids: [animalId],
		field_id: fieldId,
		date: getTodayColombia(),
	};
	if (isOnline) {
		const result = await animalFieldsService.bulkTransfer(data);
		if (!result.success) {
			throw new Error(result.message || "No se pudo guardar el traslado.");
		}
		const meta = result.meta as TransferMeta | undefined;
		const transferredCount =
			meta?.transferred_count ??
			(Array.isArray(result.data) ? result.data.length : 0);
		const skippedCount = meta?.skipped_count ?? 0;
		const changed = transferredCount > 0;
		return {
			changed,
			queued: false,
			message: changed
				? "El animal fue trasladado al potrero escogido."
				: skippedCount > 0
					? "No se cambió el potrero porque el animal ya estaba allí."
					: result.message,
		};
	}
	await offlineQueue.enqueue("POST", "animal-fields/transfer", data);
	return {
		changed: false,
		queued: true,
		message:
			"El traslado quedó guardado en este equipo y se enviará cuando vuelva la señal.",
	};
}

export function getErrorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: "No se pudo guardar el registro.";
}
