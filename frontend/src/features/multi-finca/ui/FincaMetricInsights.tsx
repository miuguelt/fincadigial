import type React from "react";
import { IconChartLine } from "@/shared/ui/icons";
import { InfoField, SectionCard, SectionTitle } from "@/shared/ui/common/ModalStyles";

interface FincaMetricInsightsProps {
	activeAnimals?: number;
	femaleAnimals?: number;
	sickAnimals?: number;
	totalAnimals?: number;
	totalFields?: number;
}

const percentage = (part?: number, total?: number) => {
	if (part === undefined || total === undefined || total <= 0) return null;
	return `${Math.round((part / total) * 100)}%`;
};

export const FincaMetricInsights: React.FC<FincaMetricInsightsProps> = ({
	activeAnimals,
	femaleAnimals,
	sickAnimals,
	totalAnimals,
	totalFields,
}) => {
	const femaleShare = percentage(femaleAnimals, totalAnimals);
	const healthShare =
		activeAnimals !== undefined && sickAnimals !== undefined && activeAnimals > 0
			? `${Math.round(
					(Math.max(activeAnimals - sickAnimals, 0) / activeAnimals) * 100,
				)}%`
			: null;
	const animalsPerField =
		activeAnimals !== undefined && totalFields !== undefined && totalFields > 0
			? (activeAnimals / totalFields).toFixed(1)
			: null;

	if (!femaleShare && !healthShare && !animalsPerField) return null;

	return (
		<SectionCard variant="accent">
			<SectionTitle icon={<IconChartLine size={13} />}>
				Indicadores calculados
			</SectionTitle>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				<InfoField
					label="Participación de hembras"
					value={femaleShare || "—"}
				/>
				<InfoField
					label="Sin tratamiento reciente"
					value={healthShare || "—"}
				/>
				<InfoField
					label="Ganado por potrero"
					value={animalsPerField || "—"}
				/>
			</div>
		</SectionCard>
	);
};

export default FincaMetricInsights;
