import { Download, Printer } from "lucide-react";
import type React from "react";
import { Button } from "@/shared/ui/button";
import { CollapsibleCard } from "@/shared/ui/common/CollapsibleCard";
import HistoryTable from "@/widgets/dashboard/admin/HistoryTable";
import { getRolePrefix } from "../utils/profile.helpers";

interface UserHistoryTablesProps {
	userRole: string | undefined;
	navigate: (path: string) => void;
	userAnimals: any[];
	userGenetics: any[];
	userAnimalFields: any[];
	userAnimalDiseases: any[];
	userTreatments: any[];
	userVaccinations: any[];
	userControls: any[];
}

export const UserHistoryTables: React.FC<UserHistoryTablesProps> = ({
	userRole,
	navigate,
	userAnimals,
	userGenetics,
	userAnimalFields,
	userAnimalDiseases,
	userTreatments,
	userVaccinations,
	userControls,
}) => {
	const rolePrefix = getRolePrefix(userRole);

	const openCrudDetail = (path: string, id: number | string) => {
		if (!id) return;
		navigate(`${rolePrefix}/${path}?detail=${id}`);
	};

	const openCrudList = (path: string, search: string = "") => {
		navigate(`${rolePrefix}/${path}${search}`);
	};

	const activitySections = [
		{
			key: "animals",
			title: "Mis Animales",
			columns: [
				{ key: "animal", label: "Animal" },
				{ key: "code", label: "Codigo" },
				{ key: "specie", label: "Especie" },
				{ key: "breed", label: "Raza" },
				{ key: "status", label: "Estado" },
			],
			rows: userAnimals,
			crudPath: "animals",
		},
		{
			key: "genetics",
			title: "Mejoras Genéticas",
			columns: [
				{ key: "animal", label: "Animal" },
				{ key: "type", label: "Tipo" },
				{ key: "date", label: "Fecha" },
				{ key: "description", label: "Descripcion" },
			],
			rows: userGenetics,
			crudPath: "genetic-improvements",
		},
		{
			key: "fields",
			title: "Lotes Asignados",
			columns: [
				{ key: "animal", label: "Animal" },
				{ key: "field", label: "Lote" },
				{ key: "entryDate", label: "Entrada" },
				{ key: "exitDate", label: "Salida" },
			],
			rows: userAnimalFields,
			crudPath: "animal-fields",
		},
		{
			key: "diseases",
			title: "Enfermedades",
			columns: [
				{ key: "animal", label: "Animal" },
				{ key: "disease", label: "Enfermedad" },
				{ key: "status", label: "Estado" },
				{ key: "date", label: "Fecha" },
			],
			rows: userAnimalDiseases,
			crudPath: "disease-animals",
		},
		{
			key: "treatments",
			title: "Tratamientos",
			columns: [
				{ key: "animal", label: "Animal" },
				{ key: "date", label: "Fecha" },
				{ key: "description", label: "Descripcion" },
				{ key: "frequency", label: "Frecuencia" },
			],
			rows: userTreatments,
			crudPath: "treatments",
		},
		{
			key: "vaccinations",
			title: "Vacunaciones",
			columns: [
				{ key: "animal", label: "Animal" },
				{ key: "vaccine", label: "Vacuna" },
				{ key: "date", label: "Fecha" },
				{ key: "responsible", label: "Responsable" },
			],
			rows: userVaccinations,
			crudPath: "vaccinations",
		},
		{
			key: "controls",
			title: "Controles Médicos",
			columns: [
				{ key: "animal", label: "Animal" },
				{ key: "date", label: "Fecha" },
				{ key: "status", label: "Estado" },
			],
			rows: userControls,
			crudPath: "controls",
		},
	];

	return (
		<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
			{activitySections.map((section) => (
				<CollapsibleCard
					key={section.key}
					title={section.title}
					defaultCollapsed={
						section.key !== "animals" &&
						section.key !== "controls" &&
						section.key !== "treatments"
					}
					badgeCount={section.rows.length}
					headerActions={
						section.rows.length > 0 ? (
							<div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
								<Button
									variant="outline"
									size="sm"
									className="h-8 rounded-lg bg-background/50 hover:bg-background"
								>
									<Download className="h-3.5 w-3.5 mr-1" />
									<span className="sr-only sm:not-sr-only sm:text-xs">CSV</span>
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="h-8 rounded-lg bg-background/50 hover:bg-background"
								>
									<Printer className="h-3.5 w-3.5 mr-1" />
									<span className="sr-only sm:not-sr-only sm:text-xs">PDF</span>
								</Button>
							</div>
						) : null
					}
				>
					<div className="p-4">
						<HistoryTable
							columns={section.columns}
							data={section.rows}
							onRowClick={(row) => {
								if (row.id) {
									openCrudDetail(section.crudPath, row.id);
								} else if (row.animalId) {
									openCrudList("animals", `?search=${row.animalId}`);
								}
							}}
						/>
					</div>
				</CollapsibleCard>
			))}
		</div>
	);
};
