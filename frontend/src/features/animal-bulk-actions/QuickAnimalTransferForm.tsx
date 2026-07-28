import { useState } from "react";
import type { ControlOption } from "@/pages/dashboard/admin/control/controlPage.types";
import { Button } from "@/shared/ui/button";
import { Combobox } from "@/shared/ui/combobox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import { useQuickAnimalTransfer } from "./useQuickAnimalTransfer";

interface QuickAnimalTransferFormProps {
	animalOptions: ControlOption[];
	fieldOptions: ControlOption[];
	loadingAnimals: boolean;
	loadingFields: boolean;
	animalError: boolean;
	fieldError: boolean;
	onRetry: () => void;
	onSuccess: () => void;
	onCancel: () => void;
}

export function QuickAnimalTransferForm({
	animalOptions,
	fieldOptions,
	loadingAnimals,
	loadingFields,
	animalError,
	fieldError,
	onRetry,
	onSuccess,
	onCancel,
}: QuickAnimalTransferFormProps) {
	const [animalId, setAnimalId] = useState("");
	const [fieldId, setFieldId] = useState("");
	const [date, setDate] = useState(getTodayColombia());
	const { submit, submitting } = useQuickAnimalTransfer(onSuccess);
	const hasError = animalError || fieldError;

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const animal = animalOptions.find(
			(option) => option.value === Number(animalId),
		);
		const field = fieldOptions.find(
			(option) => option.value === Number(fieldId),
		);
		if (!animal || !field) return;
		void submit({
			animalId: animal.value,
			fieldId: field.value,
			date,
			animalLabel: animal.label,
			fieldLabel: field.label,
		});
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			{hasError && (
				<div
					role="alert"
					className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
				>
					<p>No pudimos cargar todos los animales o potreros.</p>
					<Button
						type="button"
						variant="link"
						onClick={onRetry}
						className="mt-1 h-auto p-0 text-amber-900 underline"
					>
						Volver a intentar
					</Button>
				</div>
			)}

			<div className="space-y-2">
				<Label htmlFor="transfer-animal">Animal que va a mover</Label>
				<Combobox
					id="transfer-animal"
					value={animalId}
					onValueChange={setAnimalId}
					options={animalOptions.map((option) => ({
						value: String(option.value),
						label: option.label,
					}))}
					loading={loadingAnimals}
					disabled={animalError}
					placeholder="Busque por placa o nombre"
					searchPlaceholder="Escriba la placa o el nombre..."
					emptyMessage="No encontramos ese animal."
					className="min-h-12 text-base"
				/>
				{!loadingAnimals && !animalError && animalOptions.length === 0 && (
					<p className="text-sm text-muted-foreground">
						Aún no hay animales registrados.
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="transfer-field">Nuevo potrero</Label>
				<Combobox
					id="transfer-field"
					value={fieldId}
					onValueChange={setFieldId}
					options={fieldOptions.map((option) => ({
						value: String(option.value),
						label: option.label,
					}))}
					loading={loadingFields}
					disabled={fieldError}
					placeholder="Busque el potrero de destino"
					searchPlaceholder="Escriba el nombre del potrero..."
					emptyMessage="No encontramos ese potrero."
					className="min-h-12 text-base"
				/>
				{!loadingFields && !fieldError && fieldOptions.length === 0 && (
					<p className="text-sm text-muted-foreground">
						Aún no hay potreros registrados.
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="transfer-date">Fecha del traslado</Label>
				<Input
					id="transfer-date"
					type="date"
					value={date}
					onChange={(event) => setDate(event.target.value)}
					className="min-h-12 text-base"
					required
				/>
			</div>

			<div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					className="min-h-12 sm:min-w-32"
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					disabled={submitting || !animalId || !fieldId || hasError}
					className="min-h-12 bg-emerald-600 font-bold text-white hover:bg-emerald-700 sm:min-w-48"
				>
					{submitting ? "Guardando..." : "Guardar traslado"}
				</Button>
			</div>
		</form>
	);
}
