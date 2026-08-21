"""Nombres legibles en español para tablas y mensajes de bloqueo de borrado.

Una tabla sin entrada explícita se humaniza (``animal_alerts`` -> ``Animal
alerts``) en lugar de fallar: el mensaje sigue siendo útil aunque el catálogo
quede desactualizado.
"""

from functools import lru_cache

TABLE_LABELS: dict[str, str] = {
    "activity_log": "Bitácora de actividad",
    "animal_alert_configs": "Configuraciones de alertas",
    "animal_alerts": "Alertas del animal",
    "animal_diseases": "Enfermedades del animal",
    "animal_fields": "Asignaciones a potreros",
    "animal_group_membership": "Pertenencia a grupos",
    "animal_groups": "Grupos de animales",
    "animal_health_history": "Historial sanitario",
    "animal_images": "Imágenes del animal",
    "animal_movements": "Traslados",
    "animal_production_metrics": "Métricas de producción",
    "animals": "Animales",
    "body_condition_scores": "Condición corporal",
    "breeds": "Razas",
    "control": "Controles",
    "crop_activities": "Actividades del cultivo",
    "crop_plots": "Lotes de cultivo",
    "diseases": "Enfermedades",
    "farm_expenses": "Gastos de la finca",
    "fields": "Potreros",
    "finca": "Fincas",
    "food_types": "Tipos de alimento",
    "genetic_improvements": "Mejoras genéticas",
    "infrastructure": "Infraestructura",
    "inventory_lots": "Lotes de inventario",
    "inventory_movements": "Movimientos de inventario",
    "lactation_cycles": "Ciclos de lactancia",
    "management_plans": "Planes de manejo",
    "medications": "Medicamentos",
    "milk_production": "Producción de leche",
    "offspring": "Crías registradas",
    "operational_costs": "Costos operativos",
    "production_targets": "Metas de producción",
    "reproductive_events": "Eventos reproductivos",
    "route_administrations": "Vías de administración",
    "sinigan_registrations": "Registros SINIGÁN",
    "species": "Especies",
    "tasks": "Tareas",
    "transactions": "Transacciones",
    "treatment_medications": "Medicamentos por tratamiento",
    "treatment_recommendations": "Recomendaciones de tratamiento",
    "treatment_vaccines": "Vacunas por tratamiento",
    "treatments": "Tratamientos",
    "user": "Usuarios",
    "vaccinations": "Vacunaciones",
    "vaccines": "Vacunas",
    "water_sources": "Fuentes de agua",
}

# Nombre en singular, con artículo, para hablar del registro que se va a eliminar.
SINGULAR_LABELS: dict[str, str] = {
    "animal_fields": "la asignación a potrero",
    "animal_images": "la imagen",
    "animal_movements": "el traslado",
    "animals": "el animal",
    "breeds": "la raza",
    "control": "el control",
    "crop_plots": "el lote de cultivo",
    "diseases": "la enfermedad",
    "fields": "el potrero",
    "finca": "la finca",
    "food_types": "el tipo de alimento",
    "genetic_improvements": "la mejora genética",
    "medications": "el medicamento",
    "milk_production": "el registro de producción de leche",
    "species": "la especie",
    "tasks": "la tarea",
    "transactions": "la transacción",
    "treatments": "el tratamiento",
    "user": "el usuario",
    "vaccinations": "la vacunación",
    "vaccines": "la vacuna",
    "water_sources": "la fuente de agua",
}

# Relaciones de parentesco: el bloqueo se explica por el vínculo, no por la tabla.
SELF_REFERENCE_LABELS: dict[str, str] = {
    "idFather": "animales que lo tienen registrado como padre",
    "idMother": "animales que lo tienen registrada como madre",
    "idFatherFather": "animales que lo tienen en su árbol genealógico (abuelo paterno)",
    "idFatherMother": "animales que lo tienen en su árbol genealógico (abuela paterna)",
    "idMotherFather": "animales que lo tienen en su árbol genealógico (abuelo materno)",
    "idMotherMother": "animales que lo tienen en su árbol genealógico (abuela materna)",
}


@lru_cache(maxsize=256)
def table_label(table_name: str) -> str:
    """Nombre legible de una tabla."""
    label = TABLE_LABELS.get(table_name)
    if label:
        return label
    return table_name.replace("_", " ").capitalize()


@lru_cache(maxsize=256)
def singular_label(table_name: str) -> str:
    """Nombre en singular y con artículo del registro que se está eliminando."""
    known = SINGULAR_LABELS.get(table_name)
    if known:
        return known
    plural = table_label(table_name).lower()
    if plural.endswith("es"):
        return f"el {plural[:-2]}"
    if plural.endswith("s"):
        return f"el {plural[:-1]}"
    return f"el registro de {plural}"


def blocking_message(table_name: str, column: str, count: int, self_ref: bool) -> str:
    """Explica por qué un grupo de registros impide la eliminación."""
    if self_ref:
        vinculo = SELF_REFERENCE_LABELS.get(column, "animales relacionados")
        return f"{count} {vinculo}."
    label = table_label(table_name)
    if count == 1:
        return f"{label}: 1 registro depende de este dato y no se elimina automáticamente."
    return (
        f"{label}: {count} registros dependen de este dato y no se eliminan automáticamente."
    )


def cascade_message(table_name: str, count: int) -> str:
    """Describe los registros que se eliminarán junto con el principal."""
    label = table_label(table_name)
    if count == 1:
        return f"{label}: se eliminará 1 registro en cascada."
    return f"{label}: se eliminarán {count} registros en cascada."


def keep_message(table_name: str, count: int) -> str:
    """Vínculos que no bloquean ni se eliminan (tablas puente)."""
    label = table_label(table_name)
    if count == 1:
        return f"{label}: 1 vínculo que no impide la eliminación."
    return f"{label}: {count} vínculos que no impiden la eliminación."
