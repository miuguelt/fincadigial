import { Button } from "@/shared/ui/button";
import { REPRODUCTION_OPTIONS } from "./options";
import type { CorralFormController } from "./useCorralForm";

interface ReproductionSectionProps {
	form: CorralFormController;
}

export function ReproductionSection({ form }: ReproductionSectionProps) {
	if (!form.isFemale) return null;

	return (
		<section
			className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm sm:p-5"
			aria-labelledby="corral-reproduction-heading"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3
						id="corral-reproduction-heading"
						className="text-xl font-bold text-purple-950"
					>
						<span aria-hidden="true">4. 💕</span> ¿Hubo celo, parto u otra
						novedad?
					</h3>
					<p className="mt-1 text-sm text-purple-900">
						Solo agréguela si ocurrió hoy.
					</p>
				</div>
				<Button
					type="button"
					variant={form.showRepro ? "primary" : "outline"}
					aria-expanded={form.showRepro}
					aria-controls="corral-reproduction-options"
					onClick={form.toggleReproduction}
					className={`min-h-12 w-full sm:w-auto ${
						form.showRepro
							? "bg-purple-700 hover:bg-purple-800"
							: "border-purple-300 bg-white text-purple-800"
					}`}
				>
					{form.showRepro ? "Quitar novedad" : "Sí, agregar novedad"}
				</Button>
			</div>

			{form.showRepro && (
				<fieldset id="corral-reproduction-options" className="mt-4">
					<legend className="mb-3 font-semibold text-purple-950">
						¿Qué ocurrió?
					</legend>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						{REPRODUCTION_OPTIONS.map((event) => {
							const selected = form.reproEvent === event.id;
							return (
								<button
									key={event.id}
									type="button"
									aria-pressed={selected}
									onClick={() => form.setReproEvent(event.id)}
									className={`min-h-24 rounded-xl border-2 p-3 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-500/40 active:scale-[0.98] ${
										selected
											? "border-purple-600 bg-purple-100 font-bold text-purple-950 ring-2 ring-purple-500 ring-offset-2"
											: "border-purple-200 bg-white text-gray-700 hover:bg-purple-50"
									}`}
								>
									<span aria-hidden="true" className="block text-2xl">
										{event.icon}
									</span>
									<span className="mt-1 block text-base">{event.label}</span>
								</button>
							);
						})}
					</div>
				</fieldset>
			)}
		</section>
	);
}
