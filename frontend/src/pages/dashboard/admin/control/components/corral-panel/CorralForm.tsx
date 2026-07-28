import { AnimalMeasurementsSection } from "./AnimalMeasurementsSection";
import { FormActions } from "./FormActions";
import { HealthSection } from "./HealthSection";
import { ReproductionSection } from "./ReproductionSection";
import { TransferSection } from "./TransferSection";
import type { AnimalOption, FieldOption } from "./types";
import type { CorralFormController } from "./useCorralForm";

interface CorralFormProps {
	animals: AnimalOption[];
	fields: FieldOption[];
	form: CorralFormController;
	loadingAnimals: boolean;
	loadingFields: boolean;
	onClose?: () => void;
}

export function CorralForm({
	animals,
	fields,
	form,
	loadingAnimals,
	loadingFields,
	onClose,
}: CorralFormProps) {
	return (
		<form onSubmit={form.handleSubmit} className="space-y-6">
			<AnimalMeasurementsSection
				animals={animals}
				form={form}
				loadingAnimals={loadingAnimals}
			/>
			{form.animalId !== "" && (
				<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
					<HealthSection form={form} />
					<ReproductionSection form={form} />
					<TransferSection
						fields={fields}
						form={form}
						loadingFields={loadingFields}
					/>
					<FormActions form={form} onClose={onClose} />
				</div>
			)}
		</form>
	);
}
