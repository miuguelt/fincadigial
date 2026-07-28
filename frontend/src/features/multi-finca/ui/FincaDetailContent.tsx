import type React from "react";
import type {
	Finca,
	FincaDetail,
	LivestockSummary,
} from "@/entities/finca/api/finca.service";
import type { FincaImage } from "@/entities/finca/api/fincaImage.service";
import { FincaImageCarousel } from "@/entities/finca/ui/FincaImageCarousel";
import {
	InfoField,
	ProgressRow,
	SectionCard,
	SectionTitle,
	StatCard,
} from "@/shared/ui/common/ModalStyles";
import {
	IconActivity,
	IconBuildingFarm,
	IconCow,
	IconInfoCircle,
	IconMapPin,
	IconTrees,
	IconUsers,
} from "@/shared/ui/icons";
import FincaMetricInsights from "./FincaMetricInsights";

interface FincaDetailContentProps {
	finca: Finca;
	detail: FincaDetail | null;
	membersCount?: number;
	animalsCount?: number;
	totalFields?: number;
	summary?: LivestockSummary;
	images?: FincaImage[];
	totalAnimals?: number;
	createdDays: number | null;
	activityDays: number | null;
	hasDetailStats: boolean;
}

const formatCount = (value?: number) =>
	value === undefined || value === null
		? "No disponible"
		: value.toLocaleString("es-CO");

const formatDate = (value?: string) => {
	if (!value) return "No registrada";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "No registrada"
		: new Intl.DateTimeFormat("es-CO", {
				day: "numeric",
				month: "long",
				year: "numeric",
			}).format(date);
};

const FincaDetailContent: React.FC<FincaDetailContentProps> = ({
	finca,
	detail,
	membersCount,
	animalsCount,
	totalFields,
	summary,
	totalAnimals,
	images = [],
	createdDays,
	activityDays,
	hasDetailStats,
}) => {
	const hasComposition = Boolean(summary && totalAnimals && totalAnimals > 0);

	return (
		<div className="space-y-5">
			<FincaImageCarousel
				images={images}
				fincaName={finca.name}
				useThumbnail={false}
				className="h-52 rounded-2xl border border-slate-200 shadow-sm sm:h-64"
			/>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<StatCard icon={<IconUsers size={20} />} value={formatCount(membersCount)} label="Miembros" accent="blue" />
				<StatCard icon={<IconCow size={20} />} value={formatCount(animalsCount)} label="Ganado vivo" accent="emerald" />
				<StatCard icon={<IconTrees size={20} />} value={formatCount(totalFields)} label="Potreros" accent="amber" />
			</div>

			{hasComposition && summary && (
				<SectionCard variant="base">
					<SectionTitle icon={<IconActivity size={13} />}>Composición del ganado vivo</SectionTitle>
					<div className="space-y-3">
						<ProgressRow label="Hembras" count={summary.female_count} total={totalAnimals || 0} variant="success" />
						<ProgressRow label="Machos" count={summary.male_count} total={totalAnimals || 0} variant="info" />
						<ProgressRow label="Con tratamiento en los últimos 30 días" count={summary.sick_animals} total={totalAnimals || 0} variant="danger" />
					</div>
				</SectionCard>
			)}

			<FincaMetricInsights
				activeAnimals={summary?.active_animals ?? animalsCount}
				femaleAnimals={summary?.female_count}
				sickAnimals={summary?.sick_animals}
				totalAnimals={totalAnimals}
				totalFields={totalFields}
			/>

			<SectionCard variant="muted">
				<SectionTitle icon={<IconInfoCircle size={13} />}>Información general</SectionTitle>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					<InfoField label="Tipo" value={finca.type || "No registrado"} />
					<InfoField label="Departamento" value={detail?.department || finca.department || "No registrado"} />
					<InfoField label="Municipio" value={detail?.municipality || finca.municipality || "No registrado"} />
					<InfoField label="Registrada" value={formatDate(detail?.created_at ?? finca.created_at)} />
					<InfoField label="Antigüedad" value={createdDays === null ? "No disponible" : `${createdDays} días`} />
					<InfoField
						label="Última actividad"
						value={activityDays === null ? "Sin registro" : activityDays === 0 ? "Hoy" : `Hace ${activityDays} días`}
					/>
				</div>
			</SectionCard>

			{(detail?.address || finca.address || detail?.nit || finca.nit) && (
				<div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
					{(detail?.address || finca.address) && <div className="flex items-start gap-1.5"><IconMapPin size={14} className="mt-0.5 shrink-0" /><span>{detail?.address || finca.address}</span></div>}
					{(detail?.nit || finca.nit) && <div className="flex items-center gap-1.5"><IconBuildingFarm size={14} /><span>NIT: {detail?.nit || finca.nit}</span></div>}
				</div>
			)}
			{!hasDetailStats && !finca.is_member && <p className="text-center text-xs text-muted-foreground">Los indicadores de la finca no están compartidos públicamente.</p>}
		</div>
	);
};

export default FincaDetailContent;
