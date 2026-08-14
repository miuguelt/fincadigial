import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { HEALTH_OPTIONS } from "./options";
import type { CorralFormController } from "./useCorralForm";

interface HealthSectionProps {
	form: CorralFormController;
}

export function HealthSection({ form }: HealthSectionProps) {
	return (
		<section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm sm:p-5 dark:border-amber-800 dark:bg-amber-950/30">
			<fieldset>
				<legend className="text-xl font-bold text-amber-950 dark:text-amber-100">
					<span aria-hidden="true">3. 🩺</span> ¿Cómo ve al animal?
				</legend>
				<p id="corral-health-help" className="mb-4 mt-1 text-sm text-amber-900 dark:text-amber-200">
					Escoja una opción según lo que observa hoy. Este paso es obligatorio.
				</p>
				<div
					className="grid grid-cols-2 gap-3 md:grid-cols-4"
					aria-describedby="corral-health-help"
				>
					{HEALTH_OPTIONS.map((status) => {
						const selected = form.healthStatus === status.id;
						return (
							<button
								key={status.id}
								type="button"
								aria-pressed={selected}
								aria-label={`${status.label}: ${status.description}`}
								onClick={() => form.setHealthStatus(status.id)}
								className={`min-h-32 rounded-xl border-2 p-3 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/40 active:scale-[0.98] ${
									selected
										? `${status.selectedClass} ring-2 ring-offset-2`
										: "border-border bg-card text-foreground hover:border-amber-300 hover:bg-amber-50 dark:hover:border-amber-700 dark:hover:bg-amber-950/40"
								}`}
							>
								<span aria-hidden="true" className="block text-3xl">
									{status.icon}
								</span>
								<span className="mt-1 block text-base font-bold sm:text-lg">
									{status.label}
								</span>
								<span className="mt-1 block text-xs leading-snug sm:text-sm">
									{status.description}
								</span>
							</button>
						);
					})}
				</div>
				{form.healthStatus === "" && (
					<p
						id="corral-health-required"
						className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950 dark:bg-amber-950/60 dark:text-amber-100"
						role="status"
					>
						Seleccione cómo ve al animal para poder guardar.
					</p>
				)}
			</fieldset>

			{form.showTreatment && (
				<div
					id="corral-treatment"
					className="mt-5 rounded-xl border-2 border-red-200 bg-red-50 p-4 sm:p-5 dark:border-red-900 dark:bg-red-950/40"
				>
					<h4 className="text-lg font-bold text-red-900 dark:text-red-200">
						💊 Remedio aplicado <span className="font-normal">(opcional)</span>
					</h4>
					<p className="mb-4 mt-1 text-sm text-red-800 dark:text-red-300">
						Si anota un remedio, complete el nombre, la dosis y la frecuencia.
					</p>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="corral-treatment-name">Nombre del remedio</Label>
							<Input
								id="corral-treatment-name"
								placeholder="Ejemplo: vitamina o antibiótico"
								value={form.treatmentDesc}
								onChange={(event) => form.setTreatmentDesc(event.target.value)}
								className="h-14 border-red-200 bg-card text-base dark:border-red-900"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="corral-treatment-dose">Cantidad o dosis</Label>
							<Input
								id="corral-treatment-dose"
								placeholder="Ejemplo: 10 ml o 1 pastilla"
								value={form.treatmentDosis}
								onChange={(event) => form.setTreatmentDosis(event.target.value)}
								className="h-14 border-red-200 bg-card text-base dark:border-red-900"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="corral-treatment-frequency">
								¿Cada cuánto se aplicó?
							</Label>
							<Input
								id="corral-treatment-frequency"
								placeholder="Ejemplo: una vez o cada 12 horas"
								value={form.treatmentFrequency}
								onChange={(event) =>
									form.setTreatmentFrequency(event.target.value)
								}
								className="h-14 border-red-200 bg-card text-base dark:border-red-900"
							/>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
