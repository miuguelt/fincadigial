"""Endpoint para servir enums del sistema desde la BD (reemplaza enums.ts hardcodeados)."""

from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required

enums_ns = Namespace(
    "enums", description="📋 Enumeraciones del sistema (desde BD)", path="/enums"
)


@enums_ns.route("")
class SystemEnums(Resource):
    def get(self):
        """Obtiene todas las enumeraciones del sistema desde system_contents."""
        from app.models.system_content import SystemContent

        enums_entry = SystemContent.get_by_key("config.frontend_enums")
        if enums_entry and enums_entry.extra:
            return enums_entry.extra, 200

        return {
            "vaccine_types": [
                "Aftosa",
                "Brucelosis",
                "IBR",
                "DVB",
                "Rabia",
                "Carbón",
                "Clostridial",
                "Otra",
            ],
            "field_states": [
                "Activo",
                "Disponible",
                "Ocupado",
                "Mantenimiento",
                "Restringido",
                "Dañado",
            ],
            "animal_disease_statuses": [
                "Activo",
                "En Tratamiento",
                "Recuperado",
                "Crónico",
                "Controlado",
                "Susceptible",
            ],
            "animal_disease_severities": ["Leve", "Moderado", "Severo", "Crítico"],
            "administration_routes": [
                "Oral",
                "Inyectable IM",
                "Inyectable SC",
                "Inyectable IV",
                "Tópico",
                "Intramamario",
            ],
            "animal_genders": ["Macho", "Hembra"],
            "animal_states": [
                "Vivo",
                "Vendido",
                "Muerto",
                "Perdido",
                "Transferido",
                "En cuarentena",
                "Sacrificio",
            ],
        }, 200
