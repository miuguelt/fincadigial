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
import { CONTROL_DESCRIPTION_MAX_LENGTH } from "./controlEntryForm.model";

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

const HEALTH_OPTIONS = [
	{ value: "Excelente", label: "Muy bien", icon: "✨" },
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
	const healthGroupLabelId = useId();
	const healthGroupErrorId = useId();
	const healthGroupName = useId();
	const showHealth = mode !== "weight";
	const showWeight = mode !== "health";
	const selectedHealth = form.watch("health_status");

	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{showHealth && mode !== "health" && (
					<div className="space-y-2">
						<Label htmlFor={healthId} className="text-sm font-bold">Estado de salud</Label>
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
							<SelectTrigger id={healthId} className="h-12 rounded-xl text-base sm:text-sm">
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
						<Label htmlFor={weightId} className="text-sm font-bold">Peso en kilogramos</Label>
						<Input
							id={weightId}
							type="number"
							inputMode="decimal"
							step="0.1"
							min="0"
							className="h-12 rounded-xl text-base sm:text-sm"
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
						<div className="grid grid-cols-3 gap-2">
							{WEIGHT_HEALTH_OPTIONS.map((option) => {
								const selected = selectedHealth === option.value;
								return (
									<label
										key={option.value}
									className={`flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-1.5 py-2 text-sm font-bold transition-colors ${
										selected
											? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
											: "border-border bg-card text-foreground hover:bg-muted"
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
									<span aria-hidden="true">{option.icon}</span>
									<span>{option.label}</span>
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
						<Label htmlFor={heightId} className="text-sm font-bold">Altura en metros</Label>
						<Input
							id={heightId}
							type="number"
							step="0.01"
							min="0"
							className="h-12 rounded-xl text-base sm:text-sm"
							placeholder="Ej: 1.5"
							{...form.register("height", { setValueAs: numberValue })}
						/>
					</div>
				)}

				{mode === "health" && (
					<fieldset className="space-y-2 sm:col-span-2" aria-describedby={form.formState.errors.health_status ? healthGroupErrorId : undefined}>
						<legend id={healthGroupLabelId} className="text-sm font-bold">
							¿Cómo está el animal?
						</legend>
						<p className="text-sm text-muted-foreground">Toca la opción que mejor describe lo que viste.</p>
						<div className="grid grid-cols-2 gap-2">
							{HEALTH_OPTIONS.map((option) => {
								const selected = selectedHealth === option.value;
								return (
									<label
										key={option.value}
										className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
											selected
												? "border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
												: "border-border bg-card text-foreground hover:bg-muted"
										}`}
									>
										<input
											type="radio"
											name={healthGroupName}
											value={option.value}
											checked={selected}
											aria-label={option.label}
											onChange={() => form.setValue("health_status", option.value, { shouldDirty: true, shouldValidate: true })}
											className="sr-only"
										/>
										<span className="text-lg" aria-hidden="true">{option.icon}</span>
										<span>{option.label}</span>
									</label>
								);
							})}
						</div>
						{form.formState.errors.health_status && (
							<p id={healthGroupErrorId} className="text-sm text-red-500" role="alert">
								{form.formState.errors.health_status.message}
							</p>
						)}
					</fieldset>
				)}
			</div>

			{showHealth && (
				<div className="space-y-2">
					<Label htmlFor={descriptionId} className="text-sm font-bold">
						{mode === "health"
							? "¿Qué observaste? (opcional)"
							: "Tratamientos u observaciones"}
					</Label>
					<Textarea
						id={descriptionId}
						className="min-h-24 resize-none rounded-xl text-base sm:text-sm"
						rows={3}
						{...form.register("description")}
						placeholder={mode === "health" ? "Ej: no come, cojea o tiene una herida." : "Síntomas, medicamentos o cualquier detalle."}
						maxLength={CONTROL_DESCRIPTION_MAX_LENGTH}
					/>
				</div>
			)}
		</>
	);
}
