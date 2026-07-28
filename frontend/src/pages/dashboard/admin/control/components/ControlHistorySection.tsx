import { useMemo } from "react";
import type { CRUDColumn } from "@/shared/types/crud";
import { AdminCRUDPage } from "@/widgets/admin-crud";
import type { ControlOption } from "../controlPage.types";
import {
	buildCrudConfig,
	type ControlCrudAccess,
	type ControlRow,
	initialFormData,
	makeCustomDetailContent,
	mapResponseToForm,
	serviceAdapter,
	validateControlForm,
} from "../crudConfig";

interface ControlHistorySectionProps {
	animalOptions: ControlOption[];
	columns: CRUDColumn<ControlRow>[];
	viewMode: "table" | "cards";
	setViewMode: (mode: "table" | "cards") => void;
	access: ControlCrudAccess;
}

export function ControlHistorySection({
	animalOptions,
	columns,
	viewMode,
	setViewMode,
	access,
}: ControlHistorySectionProps) {
	const config = useMemo(
		() => ({
			...buildCrudConfig(animalOptions, columns, viewMode, setViewMode, access),
			title: "Registros anteriores de salud y peso",
			searchPlaceholder: "Buscar por animal o fecha...",
			emptyStateMessage: "Todavía no hay revisiones registradas.",
			emptyStateDescription:
				"Use “Registrar peso” o “Reportar animal enfermo” para comenzar.",
		}),
		[access, animalOptions, columns, setViewMode, viewMode],
	);

	return (
		<section
			aria-labelledby="health-records-title"
			className="min-w-0 space-y-3"
		>
			<div>
				<h2
					id="health-records-title"
					className="text-lg font-bold text-foreground"
				>
					Salud y peso anteriores
				</h2>
				<p className="text-sm text-muted-foreground">
					Consulte la última revisión, el peso y las observaciones de cada
					animal.
				</p>
			</div>
			<div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
				<AdminCRUDPage
					config={config}
					service={serviceAdapter}
					initialFormData={initialFormData}
					mapResponseToForm={mapResponseToForm}
					validateForm={validateControlForm}
					customDetailContent={makeCustomDetailContent(animalOptions)}
					realtime
					enhancedHover
					refetchOnReconnect
				/>
			</div>
		</section>
	);
}
