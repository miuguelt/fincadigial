export interface ForeignKeyReference {
	endpoint: string;
	title: string;
	relatedKeys: string[];
}

const KNOWN_REFERENCES: Record<string, ForeignKeyReference> = {
	animal: {
		endpoint: "animals",
		title: "Detalle del Animal",
		relatedKeys: ["animal"],
	},
	animals: {
		endpoint: "animals",
		title: "Detalle del Animal",
		relatedKeys: ["animal", "animals"],
	},
	animal_field: {
		endpoint: "animal-fields",
		title: "Detalle de la Asignación de Campo",
		relatedKeys: ["animal_field", "animal_fields"],
	},
	animal_group: {
		endpoint: "animal-groups",
		title: "Detalle del Grupo de Animales",
		relatedKeys: ["animal_group", "animal_groups", "group"],
	},
	birth_event: {
		endpoint: "reproductive-events",
		title: "Detalle del Evento Reproductivo",
		relatedKeys: ["birth_event", "reproductive_event", "reproductive_events"],
	},
	breed: {
		endpoint: "breeds",
		title: "Detalle de la Raza",
		relatedKeys: ["breed", "breeds"],
	},
	breeds: {
		endpoint: "breeds",
		title: "Detalle de la Raza",
		relatedKeys: ["breed", "breeds"],
	},
	campesino: {
		endpoint: "campesinos",
		title: "Detalle del Campesino",
		relatedKeys: ["campesino"],
	},
	assigned_user: {
		endpoint: "users",
		title: "Detalle del Usuario",
		relatedKeys: ["assigned_user", "user", "users"],
	},
	apprentice: {
		endpoint: "users",
		title: "Detalle del Usuario",
		relatedKeys: ["apprentice", "user", "users"],
	},
	control: {
		endpoint: "controls",
		title: "Detalle del Control",
		relatedKeys: ["control"],
	},
	current_field: {
		endpoint: "fields",
		title: "Detalle del Potrero",
		relatedKeys: ["current_field", "field", "fields"],
	},
	crop_plot: {
		endpoint: "crop-plots",
		title: "Detalle del Lote de Cultivo",
		relatedKeys: ["crop_plot", "crop_plots"],
	},
	disease: {
		endpoint: "diseases",
		title: "Detalle de la Enfermedad",
		relatedKeys: ["disease", "diseases"],
	},
	diseases: {
		endpoint: "diseases",
		title: "Detalle de la Enfermedad",
		relatedKeys: ["disease", "diseases"],
	},
	field: {
		endpoint: "fields",
		title: "Detalle del Potrero",
		relatedKeys: ["field", "fields"],
	},
	fields: {
		endpoint: "fields",
		title: "Detalle del Potrero",
		relatedKeys: ["field", "fields"],
	},
	father: {
		endpoint: "animals",
		title: "Detalle del Animal",
		relatedKeys: ["father", "animal"],
	},
	finca: {
		endpoint: "fincas",
		title: "Detalle de la Finca",
		relatedKeys: ["finca", "fincas"],
	},
	fincas: {
		endpoint: "fincas",
		title: "Detalle de la Finca",
		relatedKeys: ["finca", "fincas"],
	},
	food_type: {
		endpoint: "food_types",
		title: "Detalle del Tipo de Alimento",
		relatedKeys: ["food_type", "food_types"],
	},
	finca_destino: {
		endpoint: "fincas",
		title: "Detalle de la Finca",
		relatedKeys: ["finca_destino", "finca", "fincas"],
	},
	finca_origen: {
		endpoint: "fincas",
		title: "Detalle de la Finca",
		relatedKeys: ["finca_origen", "finca", "fincas"],
	},
	medication: {
		endpoint: "medications",
		title: "Detalle del Medicamento",
		relatedKeys: ["medication", "medications"],
	},
	medications: {
		endpoint: "medications",
		title: "Detalle del Medicamento",
		relatedKeys: ["medication", "medications"],
	},
	mother: {
		endpoint: "animals",
		title: "Detalle del Animal",
		relatedKeys: ["mother", "animal"],
	},
	instructor: {
		endpoint: "users",
		title: "Detalle del Usuario",
		relatedKeys: ["instructor", "user", "users"],
	},
	lot: {
		endpoint: "inventory-lots",
		title: "Detalle del Lote de Inventario",
		relatedKeys: ["lot", "inventory_lot", "inventory_lots"],
	},
	measured_by: {
		endpoint: "users",
		title: "Detalle del Usuario",
		relatedKeys: ["measured_by", "user", "users"],
	},
	performed_by: {
		endpoint: "users",
		title: "Detalle del Usuario",
		relatedKeys: ["performed_by", "user", "users"],
	},
	project: {
		endpoint: "projects",
		title: "Detalle del Proyecto",
		relatedKeys: ["project", "projects"],
	},
	route_administration: {
		endpoint: "route-administrations",
		title: "Detalle de la Ruta de Administración",
		relatedKeys: ["route_administration", "route_administrations"],
	},
	target_disease: {
		endpoint: "diseases",
		title: "Detalle de la Enfermedad",
		relatedKeys: ["target_disease", "disease", "diseases"],
	},
	species: {
		endpoint: "species",
		title: "Detalle de la Especie",
		relatedKeys: ["species"],
	},
	sire: {
		endpoint: "animals",
		title: "Detalle del Animal",
		relatedKeys: ["sire", "animal"],
	},
	territory: {
		endpoint: "territories",
		title: "Detalle del Territorio",
		relatedKeys: ["territory", "territories"],
	},
	task: {
		endpoint: "tasks",
		title: "Detalle de la Tarea",
		relatedKeys: ["task", "tasks"],
	},
	treatment: {
		endpoint: "treatments",
		title: "Detalle del Tratamiento",
		relatedKeys: ["treatment", "treatments"],
	},
	vaccine: {
		endpoint: "vaccines",
		title: "Detalle de la Vacuna",
		relatedKeys: ["vaccine", "vaccines"],
	},
	user: {
		endpoint: "users",
		title: "Detalle del Usuario",
		relatedKeys: ["user", "users"],
	},
	water_source: {
		endpoint: "water-sources",
		title: "Detalle de la Fuente de Agua",
		relatedKeys: ["water_source", "water_sources"],
	},
};

const USER_RELATIONS = new Set([
	"actor",
	"evaluator",
	"processed_by",
	"recorded_by",
	"resolved_by",
	"uploaded_by",
	"supervisor",
]);

const humanize = (value: string): string =>
	value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function getForeignKeyReference(
	fieldName: string,
): ForeignKeyReference | null {
	const normalized = fieldName
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.toLowerCase();
	if (!normalized.endsWith("_id")) return null;

	const relation = normalized.startsWith("id_")
		? normalized.slice(3)
		: normalized.slice(0, -3);
	if (!relation) return null;

	const known = KNOWN_REFERENCES[relation];
	if (known) return known;
	if (
		USER_RELATIONS.has(relation) ||
		relation.endsWith("_by") ||
		relation.endsWith("_user")
	) {
		return KNOWN_REFERENCES.user;
	}

	const endpoint = relation.endsWith("s") ? relation : `${relation}s`;
	return {
		endpoint,
		title: `Detalle de ${humanize(relation)}`,
		relatedKeys: [relation, endpoint.replace(/-/g, "_")],
	};
}

export function isForeignKeyField(fieldName: string): boolean {
	return getForeignKeyReference(fieldName) !== null;
}

export function getRelatedRecordLabel(
	data: Record<string, unknown>,
	reference: ForeignKeyReference,
	id: number | string,
): string {
	for (const key of reference.relatedKeys) {
		const related = data[key];
		if (related && typeof related === "object") {
			const record = related as Record<string, unknown>;
			const label =
				record.name || record.nombre || record.record || record.description;
			if (label) return String(label);
		}
	}
	const title = reference.title.replace(
		/^Detalle\s+(del|de la|de el|de)\s+/i,
		"",
	);
	return `${title} #${id}`;
}
