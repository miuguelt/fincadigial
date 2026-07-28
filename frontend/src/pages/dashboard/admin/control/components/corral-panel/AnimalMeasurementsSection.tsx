import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import type { AnimalOption } from "./types";
import type { CorralFormController } from "./useCorralForm";

interface AnimalMeasurementsSectionProps {
	animals: AnimalOption[];
	form: CorralFormController;
	loadingAnimals: boolean;
}

export function AnimalMeasurementsSection({
	animals,
	form,
	loadingAnimals,
}: AnimalMeasurementsSectionProps) {
	return (
		<>
			<section
				className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm sm:p-5"
				aria-labelledby="corral-animal-heading"
			>
				<h3
					id="corral-animal-heading"
					className="mb-2 text-xl font-bold text-blue-950"
				>
					<span aria-hidden="true">1. 🐄</span> ¿Qué animal está revisando?
				</h3>
				<p id="corral-animal-help" className="mb-4 text-sm text-blue-900">
					Busque el número o nombre que aparece en la marca del animal.
				</p>
				<Label htmlFor="corral-animal" className="sr-only">
					Animal
				</Label>
				<Select
					value={form.animalId === "" ? "" : String(form.animalId)}
					onValueChange={(value) =>
						form.selectAnimal(Number.parseInt(value, 10))
					}
					disabled={loadingAnimals}
				>
					<SelectTrigger
						id="corral-animal"
						aria-describedby="corral-animal-help"
						className="h-16 w-full border-blue-300 bg-white text-left text-lg shadow-sm sm:text-xl"
					>
						<SelectValue
							placeholder={
								loadingAnimals
									? "Cargando animales…"
									: "Toque aquí para escoger"
							}
						/>
					</SelectTrigger>
					<SelectContent className="max-h-[300px]">
						{animals.map((animal) => (
							<SelectItem
								key={animal.value}
								value={String(animal.value)}
								className="min-h-12 cursor-pointer border-b border-gray-100 p-4 text-lg last:border-0"
							>
								{animal.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</section>

			{form.animalId !== "" && (
				<section
					className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm sm:p-5"
					aria-labelledby="corral-measurements-heading"
				>
					<h3
						id="corral-measurements-heading"
						className="text-xl font-bold text-emerald-950"
					>
						<span aria-hidden="true">2. 📏</span> Anote lo que pudo medir
					</h3>
					<p className="mb-4 mt-1 text-sm text-emerald-900">
						Estos dos datos son opcionales. Si no los tiene, continúe.
					</p>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div
							className={`space-y-2 rounded-xl border-2 p-4 ${
								form.isFemale
									? "border-emerald-200 bg-white"
									: "border-gray-200 bg-gray-100"
							}`}
						>
							<Label
								htmlFor="corral-milk"
								className="text-base font-semibold text-gray-800"
							>
								🥛 Litros de leche
							</Label>
							<div className="relative">
								<Input
									id="corral-milk"
									type="number"
									inputMode="decimal"
									step="0.1"
									min="0"
									disabled={!form.isFemale}
									aria-describedby="corral-milk-help"
									className="h-16 bg-white pr-12 text-center text-3xl font-bold"
									placeholder="0,0"
									value={form.milkLiters}
									onChange={(event) => form.setMilkLiters(event.target.value)}
								/>
								<span
									aria-hidden="true"
									className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-500"
								>
									L
								</span>
							</div>
							<p
								id="corral-milk-help"
								className="text-sm text-gray-600"
								aria-live="polite"
							>
								{form.isFemale
									? "Déjelo vacío si hoy no midió la leche."
									: "No aplica: el animal seleccionado es macho."}
							</p>
						</div>

						<div className="space-y-2 rounded-xl border-2 border-emerald-200 bg-white p-4">
							<Label
								htmlFor="corral-weight"
								className="text-base font-semibold text-gray-800"
							>
								⚖️ Peso del animal
							</Label>
							<div className="relative">
								<Input
									id="corral-weight"
									type="number"
									inputMode="decimal"
									step="1"
									min="0"
									aria-describedby="corral-weight-help"
									className="h-16 pr-14 text-center text-3xl font-bold"
									placeholder="0"
									value={form.weight}
									onChange={(event) => form.setWeight(event.target.value)}
								/>
								<span
									aria-hidden="true"
									className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-500"
								>
									kg
								</span>
							</div>
							<p id="corral-weight-help" className="text-sm text-gray-600">
								Déjelo vacío si hoy no pesó el animal.
							</p>
						</div>
					</div>
				</section>
			)}
		</>
	);
}
