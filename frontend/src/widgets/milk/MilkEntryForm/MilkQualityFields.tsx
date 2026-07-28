import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { cn } from "@/shared/ui/cn";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { MilkEntryFormValues } from "./milkEntryForm.schema";

interface MilkQualityFieldsProps {
	form: UseFormReturn<MilkEntryFormValues>;
}

const optionalNumber = (value: string) =>
	value.trim() === "" ? undefined : Number(value);

export function MilkQualityFields({ form }: MilkQualityFieldsProps) {
	const [isOpen, setIsOpen] = useState(false);
	const {
		register,
		formState: { errors },
	} = form;

	return (
		<div className="rounded-xl border border-border bg-muted/30">
			<button
				id="milk-quality-toggle"
				type="button"
				aria-expanded={isOpen}
				aria-controls="milk-quality-fields"
				onClick={() => setIsOpen((current) => !current)}
				className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<span>
					<span className="block font-semibold">
						Agregar datos del laboratorio
					</span>
					<span className="block text-sm text-muted-foreground">
						Solo si tiene el resultado a la mano.
					</span>
				</span>
				<ChevronDown
					aria-hidden="true"
					className={cn(
						"h-5 w-5 shrink-0 transition-transform",
						isOpen && "rotate-180",
					)}
				/>
			</button>

			{isOpen && (
				<section
					id="milk-quality-fields"
					aria-labelledby="milk-quality-toggle"
					className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-3"
				>
					<div className="space-y-2">
						<Label htmlFor="fat_percentage">Grasa (%)</Label>
						<Input
							id="fat_percentage"
							type="number"
							inputMode="decimal"
							step="0.1"
							min="0"
							max="100"
							{...register("fat_percentage", {
								setValueAs: optionalNumber,
							})}
							placeholder="Ejemplo: 3,5"
						/>
						{errors.fat_percentage && (
							<p role="alert" className="text-sm text-destructive">
								{errors.fat_percentage.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="protein_percentage">Proteína (%)</Label>
						<Input
							id="protein_percentage"
							type="number"
							inputMode="decimal"
							step="0.1"
							min="0"
							max="100"
							{...register("protein_percentage", {
								setValueAs: optionalNumber,
							})}
							placeholder="Ejemplo: 3,2"
						/>
						{errors.protein_percentage && (
							<p role="alert" className="text-sm text-destructive">
								{errors.protein_percentage.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="somatic_cells">
							Células somáticas según el laboratorio
						</Label>
						<Input
							id="somatic_cells"
							type="number"
							inputMode="numeric"
							min="0"
							max="1000000"
							{...register("somatic_cells", {
								setValueAs: optionalNumber,
							})}
							placeholder="Ejemplo: 200000"
							aria-describedby="somatic-cells-help"
						/>
						<p
							id="somatic-cells-help"
							className="text-xs text-muted-foreground"
						>
							Copie el número de células por mililitro que aparece en el
							resultado.
						</p>
						{errors.somatic_cells && (
							<p role="alert" className="text-sm text-destructive">
								{errors.somatic_cells.message}
							</p>
						)}
					</div>
				</section>
			)}
		</div>
	);
}
