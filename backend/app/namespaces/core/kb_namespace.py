from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required

from app.services.recommendation_engine import RecomendacionMotor
from app.utils.response_handler import APIResponse

kb_ns = Namespace(
    "knowledge_base",
    description="Motor de Recomendaciones Agropecuarias (Offline-First)",
)

# ── Rate Limiting — protege el VPS de consultas masivas ───────────────
# 60 req/minuto por IP es suficiente para uso normal en campo
_RATE_LIMIT = "60 per minute"

regla_model = kb_ns.model(
    "KBRegla",
    {
        "campo_condicion": fields.String(),
        "operador": fields.String(),
        "valor": fields.String(),
        "descripcion_corta": fields.String(),
    },
)

recomendacion_model = kb_ns.model(
    "KBRecomendacion",
    {
        "id": fields.Integer(),
        "codigo": fields.String(),
        "categoria": fields.String(),
        "titulo": fields.String(),
        "descripcion": fields.String(),
        "accion": fields.String(),
        "cuando": fields.String(),
        "profesional": fields.Boolean(),
        "urgencia": fields.String(),
        "fuente": fields.String(),
        "contexto_aplicado": fields.String(),
    },
)

calendario_model = kb_ns.model(
    "KBCalendario",
    {
        "codigo": fields.String(),
        "nombre": fields.String(),
        "descripcion": fields.String(),
        "tipo": fields.String(),
        "obligatorio_ica": fields.Boolean(),
        "producto_sugerido": fields.String(),
        "dosis_referencia": fields.String(),
        "fuente": fields.String(),
    },
)

categorias_model = kb_ns.model(
    "KBCategorias", {"categoria": fields.String(), "total": fields.Integer()}
)


@kb_ns.route("/recomendaciones/animal/<int:animal_id>")
class AnimalRecomendaciones(Resource):
    @kb_ns.doc("get_animal_recommendations")
    @jwt_required()
    def get(self, animal_id):
        """Recomendaciones precomputadas para un animal (motor de reglas ICA/FEDEGAN)."""
        try:
            resultados = RecomendacionMotor.para_animal(animal_id)
            return APIResponse.success(
                resultados, "Recomendaciones generadas exitosamente"
            )
        except Exception as e:
            return APIResponse.error(str(e), status_code=500)


@kb_ns.route("/calendario/animal/<int:animal_id>")
class AnimalCalendario(Resource):
    @kb_ns.doc("get_animal_calendar_events")
    @jwt_required()
    def get(self, animal_id):
        """Eventos del calendario sanitario pendientes para un animal."""
        try:
            resultados = RecomendacionMotor.calendario_para_animal(animal_id)
            return APIResponse.success(resultados, "Calendario generado exitosamente")
        except Exception as e:
            return APIResponse.error(str(e), status_code=500)


@kb_ns.route("/test")
class KBTest(Resource):
    def get(self):
        return {"status": "ok"}


@kb_ns.route("/calendario/hato")
class CalendarioHato(Resource):
    @kb_ns.doc("get_hato_calendar")
    def get(self):
        """Resumen del calendario sanitario para todo el hato (próximos 30 días)."""
        try:
            from app.models.animals import Animals
            from app.models.knowledge_base import KBCalendario

            calendarios = KBCalendario.query.filter_by(activo=True).all()
            animales = Animals.query.filter_by(status="Vivo").all()

            proximos = []
            for animal in animales[:100]:  # Limitar a 100 para performance en VPS
                edad_dias = animal.age_in_days or 0
                for cal in calendarios:
                    if cal.sexo.value not in (
                        "Ambos",
                        (animal.sex.value if animal.sex else "Ambos"),
                    ):
                        continue
                    if cal.edad_inicio_dias and edad_dias < cal.edad_inicio_dias:
                        continue
                    if cal.edad_fin_dias and edad_dias > cal.edad_fin_dias:
                        continue
                    proximos.append(
                        {
                            **cal.to_dict(),
                            "animal_id": animal.id,
                            "animal_record": animal.record,
                            "edad_actual_dias": edad_dias,
                        }
                    )
            return APIResponse.success(
                proximos, f"{len(proximos)} eventos pendientes en el hato"
            )
        except Exception as e:
            return APIResponse.error(str(e), status_code=500)


@kb_ns.route("/stats")
class KBStats(Resource):
    @kb_ns.doc("get_kb_stats")
    @jwt_required()
    def get(self):
        """Estadísticas de la base de conocimiento (para validar el seed)."""
        try:
            from app.models.knowledge_base import KBRecomendacion, KBCalendario

            total_recs = KBRecomendacion.query.filter_by(activo=True).count()
            total_cals = KBCalendario.query.filter_by(activo=True).count()
            return APIResponse.success(
                {
                    "recomendaciones_activas": total_recs,
                    "calendarios_activos": total_cals,
                    "motor_version": "2.0",
                    "fuentes": ["ICA Colombia", "FEDEGAN", "SENA"],
                },
                "OK",
            )
        except Exception as e:
            return APIResponse.error(str(e), status_code=500)
