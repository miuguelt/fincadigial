import { useId } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { getTodayColombia } from "@/shared/utils/dateUtils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import type {
	ControlEntryAnimal,
	ControlEntryFormValues,
} from "./ControlEntryForm.types";

interface ControlEntryCommonFieldsProps {
	form: UseFormReturn<ControlEntryFormValues>;
	animals: ControlEntryAnimal[];
	loadingAnimals: boolean;
}

function getAnimalLabel(animal: ControlEntryAnimal): string {
	const record = animal.record || animal.registro || `Animal #${animal.id}`;
	const name = animal.alias || animal.name || animal.nombre;
	return name ? `${record} - ${name}` : record;
}

export function ControlEntryCommonFields({
	form,
	animals,
	loadingAnimals,
}: ControlEntryCommonFieldsProps) {
	const animalFieldId = useId();
	const animalErrorId = useId();
	const dateFieldId = useId();
	const dateErrorId = useId();
	const animalError = form.formState.errors.animal_id;
	const dateError = form.formState.errors.checkup_date;

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div className="space-y-2">
				<Label htmlFor={animalFieldId} className="text-sm font-bold">Animal</Label>
				<Select
					value={form.watch("animal_id")?.toString()}
					onValueChange={(value) =>
						form.setValue("animal_id", Number(value), {
							shouldValidate: true,
						})
					}
					disabled={loadingAnimals}
				>
					<SelectTrigger
						id={animalFieldId}
						className="h-12 rounded-xl text-base sm:text-sm"
						aria-invalid={Boolean(animalError)}
						aria-describedby={animalError ? animalErrorId : undefined}
					>
						<SelectValue
							placeholder={
								loadingAnimals ? "Cargando..." : "Seleccionar animal"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{animals.map((animal) => (
							<SelectItem key={animal.id} value={animal.id.toString()}>
								{getAnimalLabel(animal)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{animalError && (
					<p id={animalErrorId} className="text-sm text-red-500" role="alert">
						{animalError.message}
					</p>
				)}
				{!loadingAnimals && animals.length === 0 && !animalError && (
					<p className="text-sm text-amber-700 dark:text-amber-300" role="status">
						No hay animales vivos disponibles.
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor={dateFieldId} className="text-sm font-bold">Fecha</Label>
				<Input
					id={dateFieldId}
					type="date"
					max={getTodayColombia()}
					className="h-12 rounded-xl text-base sm:text-sm"
					aria-invalid={Boolean(dateError)}
					aria-describedby={dateError ? dateErrorId : undefined}
					{...form.register("checkup_date")}
				/>
				{dateError && (
					<p id={dateErrorId} className="text-sm text-red-500" role="alert">
						{dateError.message}
					</p>
				)}
			</div>
		</div>
	);
}
