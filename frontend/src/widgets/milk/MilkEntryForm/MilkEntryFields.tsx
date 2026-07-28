import type { UseFormReturn } from "react-hook-form";
import { cn } from "@/shared/ui/cn";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import type { MilkEntryFormValues } from "./milkEntryForm.schema";

type AnimalOption = {
	id: number;
	record?: string;
	alias?: string;
	name?: string;
	breed?: { name?: string };
};

interface MilkEntryFieldsProps {
	form: UseFormReturn<MilkEntryFormValues>;
	animals?: AnimalOption[];
	loadingAnimals: boolean;
}

const sessions = [
	{ value: "AM", label: "Mañana" },
	{ value: "PM", label: "Tarde" },
	{ value: "Extra", label: "Ordeño extra" },
] as const;

function getCowLabel(animal: AnimalOption): string {
	const identifier = animal.record || `Vaca #${animal.id}`;
	const detail = animal.alias || animal.name || animal.breed?.name;
	return detail ? `${identifier} · ${detail}` : identifier;
}

export function MilkEntryFields({
	form,
	animals,
	loadingAnimals,
}: MilkEntryFieldsProps) {
	const {
		register,
		setValue,
		watch,
		formState: { errors },
	} = form;
	const selectedAnimalId = watch("animal_id");
	const selectedSession = watch("milking_session");

	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="animal_id">¿Qué vaca ordeñó?</Label>
					<Select
						value={selectedAnimalId?.toString()}
						onValueChange={(value) =>
							setValue("animal_id", Number(value), { shouldValidate: true })
						}
					>
						<SelectTrigger
							id="animal_id"
							aria-invalid={Boolean(errors.animal_id)}
							aria-describedby={
								errors.animal_id ? "animal_id-error" : undefined
							}
							className="h-12 text-base"
						>
							<SelectValue
								placeholder={
									loadingAnimals
										? "Cargando las vacas..."
										: "Seleccione una vaca"
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{animals?.map((animal) => (
								<SelectItem key={animal.id} value={animal.id.toString()}>
									{getCowLabel(animal)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.animal_id && (
						<p
							id="animal_id-error"
							role="alert"
							className="text-sm text-destructive"
						>
							{errors.animal_id.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="liters">Litros recogidos</Label>
					<Input
						id="liters"
						type="number"
						inputMode="decimal"
						step="0.1"
						min="0"
						max="80"
						{...register("liters")}
						placeholder="Ejemplo: 8,5"
						aria-invalid={Boolean(errors.liters)}
						aria-describedby="liters-help liters-error"
						className="h-12 text-base"
					/>
					<p id="liters-help" className="text-sm text-muted-foreground">
						Anote la cantidad que marcó el balde o el medidor.
					</p>
					{errors.liters && (
						<p
							id="liters-error"
							role="alert"
							className="text-sm text-destructive"
						>
							{errors.liters.message}
						</p>
					)}
				</div>

				<fieldset className="space-y-2">
					<legend className="text-sm font-medium">
						¿En qué momento ordeñó?
					</legend>
					<div className="grid grid-cols-3 gap-2">
						{sessions.map((session) => (
							<button
								key={session.value}
								type="button"
								aria-pressed={selectedSession === session.value}
								onClick={() =>
									setValue("milking_session", session.value, {
										shouldValidate: true,
									})
								}
								className={cn(
									"min-h-12 rounded-xl border-2 px-2 py-2 text-sm font-semibold transition-colors",
									selectedSession === session.value
										? "border-primary bg-primary/10 text-primary"
										: "border-border bg-background text-foreground hover:bg-muted",
								)}
							>
								{session.label}
							</button>
						))}
					</div>
				</fieldset>

				<div className="space-y-2">
					<Label htmlFor="date">Fecha del ordeño</Label>
					<Input
						id="date"
						type="date"
						{...register("date")}
						aria-invalid={Boolean(errors.date)}
						aria-describedby={errors.date ? "date-error" : undefined}
						className="h-12 text-base"
					/>
					{errors.date && (
						<p
							id="date-error"
							role="alert"
							className="text-sm text-destructive"
						>
							{errors.date.message}
						</p>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="notes">¿Pasó algo durante el ordeño? (opcional)</Label>
				<Textarea
					id="notes"
					{...register("notes")}
					placeholder="Ejemplo: la vaca estaba inquieta o la leche cambió de aspecto."
					maxLength={500}
					className="min-h-20"
				/>
			</div>
		</>
	);
}
