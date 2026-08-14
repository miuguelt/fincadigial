import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import type { FieldOption } from "./types";
import type { CorralFormController } from "./useCorralForm";

interface TransferSectionProps {
	fields: FieldOption[];
	form: CorralFormController;
	loadingFields: boolean;
}

export function TransferSection({
	fields,
	form,
	loadingFields,
}: TransferSectionProps) {
	const step = form.isFemale ? 5 : 4;

	return (
		<section
			className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm sm:p-5 dark:border-orange-800 dark:bg-orange-950/30"
			aria-labelledby="corral-transfer-heading"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3
						id="corral-transfer-heading"
						className="text-xl font-bold text-orange-950 dark:text-orange-100"
					>
						<span aria-hidden="true">{step}. 🌱</span> ¿Lo va a pasar a otro
						potrero?
					</h3>
					<p className="mt-1 text-sm text-orange-900 dark:text-orange-200">Este paso es opcional.</p>
				</div>
				<Button
					type="button"
					variant={form.showTransfer ? "primary" : "outline"}
					aria-expanded={form.showTransfer}
					aria-controls="corral-transfer-fields"
					onClick={form.toggleTransfer}
					className={`min-h-12 w-full sm:w-auto ${
						form.showTransfer
							? "bg-orange-700 text-white hover:bg-orange-800"
							: "border-orange-300 bg-card text-orange-800 dark:border-orange-700 dark:text-orange-300"
					}`}
				>
					{form.showTransfer ? "No trasladar" : "Sí, trasladar"}
				</Button>
			</div>

			{form.showTransfer && (
				<div id="corral-transfer-fields" className="mt-4 space-y-2">
					<Label
						htmlFor="corral-target-field"
						className="text-base font-semibold text-foreground"
					>
						¿A cuál potrero va?
					</Label>
					<Select
						value={form.targetFieldId === "" ? "" : String(form.targetFieldId)}
						onValueChange={(value) =>
							form.setTargetFieldId(Number.parseInt(value, 10))
						}
						disabled={loadingFields}
					>
						<SelectTrigger
							id="corral-target-field"
							aria-describedby="corral-target-field-help"
							className="h-14 w-full border-orange-300 bg-card text-base sm:text-lg dark:border-orange-700"
						>
							<SelectValue
								placeholder={
									loadingFields
										? "Cargando potreros…"
										: "Toque aquí para escoger el potrero"
								}
							/>
						</SelectTrigger>
						<SelectContent className="max-h-[250px]">
							{fields.map((field) => (
								<SelectItem
									key={field.value}
									value={String(field.value)}
									className="min-h-12 cursor-pointer p-3 text-lg"
								>
									{field.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p id="corral-target-field-help" className="text-sm text-muted-foreground">
						{!loadingFields && fields.length === 0
							? "No hay potreros disponibles para escoger."
							: "El traslado se guardará junto con este registro."}
					</p>
				</div>
			)}
		</section>
	);
}
