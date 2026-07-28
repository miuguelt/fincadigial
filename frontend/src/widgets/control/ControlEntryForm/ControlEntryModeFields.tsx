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
import { Textarea } from "@/shared/ui/textarea";
import type {
	ControlEntryFormValues,
	ControlEntryMode,
} from "./ControlEntryForm.types";

interface ControlEntryModeFieldsProps {
	form: UseFormReturn<ControlEntryFormValues>;
	mode: ControlEntryMode;
}

const numberValue = (value: string): number | undefined =>
	value === "" ? undefined : Number(value);

const WEIGHT_HEALTH_OPTIONS = [
	{ value: "Sano", label: "Normal", icon: "✅" },
	{ value: "Regular", label: "Decaído", icon: "⚠️" },
	{ value: "Malo", label: "Enfermo", icon: "🚨" },
] as const;

export function ControlEntryModeFields({
	form,
	mode,
}: ControlEntryModeFieldsProps) {
	const healthId = useId();
	const weightId = useId();
	const heightId = useId();
	const descriptionId = useId();
	const weightHealthLabelId = useId();
	const weightHealthErrorId = useId();
	const weightHealthGroupName = useId();
	const showHealth = mode !== "weight";
	const showWeight = mode !== "health";
	const selectedHealth = form.watch("health_status");

	return (
		<>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
				{showHealth && (
					<div className="space-y-2">
						<Label htmlFor={healthId}>Estado de salud</Label>
						<Select
							value={form.watch("health_status")}
							onValueChange={(value) =>
								form.setValue(
									"health_status",
									value as ControlEntryFormValues["health_status"],
									{ shouldValidate: true },
								)
							}
						>
							<SelectTrigger id={healthId} className="h-12">
								<SelectValue placeholder="Seleccione el estado" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Excelente">Excelente (Muy bien)</SelectItem>
								<SelectItem value="Sano">Sano (Normal)</SelectItem>
								<SelectItem value="Regular">Regular (Decaído)</SelectItem>
								<SelectItem value="Malo">Malo (Enfermo)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}

				{showWeight && (
					<div className="space-y-2">
						<Label htmlFor={weightId}>Peso (kg)</Label>
						<Input
							id={weightId}
							type="number"
							step="1"
							min="0"
							className="h-12"
							placeholder="Ej: 450"
							{...form.register("weight", { setValueAs: numberValue })}
						/>
						{form.formState.errors.weight && (
							<p className="text-sm text-red-500" role="alert">
								{form.formState.errors.weight.message}
							</p>
						)}
					</div>
				)}

				{mode === "weight" && (
					<fieldset className="space-y-2 md:col-span-2">
						<legend
							id={weightHealthLabelId}
							className="text-sm font-medium leading-none"
						>
							¿Cómo se veía el animal?
						</legend>
						<p className="text-sm text-muted-foreground">
							Elija lo que observó mientras lo pesaba.
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
							{WEIGHT_HEALTH_OPTIONS.map((option) => {
								const selected = selectedHealth === option.value;
								return (
									<label
										key={option.value}
										className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-base font-bold transition-colors ${
											selected
												? "border-emerald-600 bg-emerald-50 text-emerald-800"
												: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
										}`}
									>
										<input
											type="radio"
											name={weightHealthGroupName}
											value={option.value}
											checked={selected}
											aria-label={option.label}
											aria-describedby={
												form.formState.errors.health_status
													? weightHealthErrorId
													: undefined
											}
											onChange={() =>
												form.setValue("health_status", option.value, {
													shouldDirty: true,
													shouldValidate: true,
												})
											}
											className="sr-only"
										/>
										{option.icon} {selected ? "✓ " : ""}
										{option.label}
									</label>
								);
							})}
						</div>
						{form.formState.errors.health_status && (
							<p
								id={weightHealthErrorId}
								className="text-sm text-red-500"
								role="alert"
							>
								{form.formState.errors.health_status.message}
							</p>
						)}
					</fieldset>
				)}

				{mode === "full" && (
					<div className="space-y-2">
						<Label htmlFor={heightId}>Altura (m)</Label>
						<Input
							id={heightId}
							type="number"
							step="0.01"
							min="0"
							className="h-12"
							placeholder="Ej: 1.5"
							{...form.register("height", { setValueAs: numberValue })}
						/>
					</div>
				)}
			</div>

			{showHealth && (
				<div className="space-y-2">
					<Label htmlFor={descriptionId}>
						{mode === "health"
							? "Observaciones"
							: "Tratamientos u observaciones"}
					</Label>
					<Textarea
						id={descriptionId}
						className="resize-none"
						rows={3}
						{...form.register("description")}
						placeholder="Describa síntomas, medicamentos aplicados o cualquier detalle."
						maxLength={500}
					/>
				</div>
			)}
		</>
	);
}
