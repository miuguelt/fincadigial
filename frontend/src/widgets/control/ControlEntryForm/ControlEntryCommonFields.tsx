import { useId } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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
	const animalError = form.formState.errors.animal_id;

	return (
		<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
			<div className="space-y-2">
				<Label htmlFor={animalFieldId}>Animal</Label>
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
						className="h-12"
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
			</div>

			<div className="space-y-2">
				<Label htmlFor={dateFieldId}>Fecha</Label>
				<Input
					id={dateFieldId}
					type="date"
					className="h-12"
					{...form.register("checkup_date")}
				/>
			</div>
		</div>
	);
}
