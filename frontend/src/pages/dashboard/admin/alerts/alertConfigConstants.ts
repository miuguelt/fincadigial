export const DIMENSIONS_BY_TYPE: Record<string, Array<{ value: string; label: string; operators: string[] }>> = {
	Salud: [
		{ value: "dias_sin_control", label: "Días sin control veterinario", operators: [">", ">=", "=="] },
		{ value: "dias_sin_vacuna", label: "Días desde última vacuna", operators: [">", ">="] },
		{ value: "dias_sin_desparasitar", label: "Días sin desparasitar", operators: [">", ">="] },
		{ value: "salud", label: "Estado de salud general", operators: ["==", "!="] },
		{ value: "temperatura", label: "Temperatura corporal (°C)", operators: [">", "<", ">=", "<="] },
	],
	Crecimiento: [
		{ value: "peso", label: "Peso actual (kg)", operators: ["<", ">", "<=", ">="] },
		{ value: "ganancia_diaria", label: "Ganancia diaria de peso (kg/día)", operators: ["<", ">", "<="] },
		{ value: "dias_sin_pesar", label: "Días sin registro de peso", operators: [">", ">="] },
		{ value: "edad_meses", label: "Edad (meses)", operators: [">", "<", ">="] },
	],
	Producción: [
		{ value: "rendimiento_leche_diario", label: "Producción de leche diaria (L)", operators: ["<", ">", "<="] },
		{ value: "dias_en_potrero", label: "Días en mismo potrero", operators: [">", ">="] },
		{ value: "dias_en_ordeño", label: "Días consecutivos en ordeño", operators: [">", ">="] },
		{ value: "calidad_leche", label: "Calidad de leche", operators: ["==", "!="] },
	],
	Reproducción: [
		{ value: "dias_sin_celo", label: "Días sin detectar celo", operators: [">", ">="] },
		{ value: "dias_gestacion", label: "Días de gestación", operators: [">", "<", ">="] },
		{ value: "partos_totales", label: "Número de partos", operators: [">", ">="] },
		{ value: "intervalo_partos", label: "Intervalo entre partos (días)", operators: [">", "<"] },
	],
	Personalizada: [
		{ value: "custom_field", label: "Campo personalizado", operators: ["==", "!=", ">", "<", ">=", "<="] },
	],
};

export const OPERATOR_LABELS: Record<string, string> = {
	">": "mayor que",
	"<": "menor que",
	">=": "mayor o igual a",
	"<=": "menor o igual a",
	"==": "igual a",
	"!=": "diferente de",
};
