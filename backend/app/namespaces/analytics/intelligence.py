from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.analytics.farming_intelligence_service import (
    FarmingIntelligenceService,
)
from app.services.analytics.regional_intelligence import (
    RegionalBenchmarkingService,
    DigitalAdvisorService,
)
from app.models.user_finca import UserFinca
from app import db
from sqlalchemy import func

from app.models.system_content import SystemContent

ns = Namespace(
    "intelligence", description="Inteligencia ganadera y KPIs para el productor"
)


@ns.route("/at-a-glance")
class AtAGlance(Resource):
    @jwt_required()
    @ns.doc("get_at_a_glance")
    def get(self):
        """Obtiene un resumen rápido del estado de la finca para el dashboard campesino."""
        user_id = get_jwt_identity()
        # Obtener la finca activa del usuario
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca:
            return {"message": "No hay una finca activa seleccionada"}, 400

        data = FarmingIntelligenceService.get_farm_at_a_glance(user_finca.finca_id)
        return data, 200


@ns.route("/regional-comparison")
class RegionalComparison(Resource):
    @jwt_required()
    def get(self):
        """Compara la finca con el promedio regional usando datos reales de la BD."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca:
            return {"message": "No hay una finca activa seleccionada"}, 400
        from app.services.analytics.farming_intelligence_service import (
            FarmingIntelligenceService,
        )

        data = FarmingIntelligenceService.get_farm_at_a_glance(user_finca.finca_id)
        from app.models.milk_production import MilkProduction

        avg_milk = (
            db.session.query(func.avg(MilkProduction.liters))
            .filter(MilkProduction.finca_id == user_finca.finca_id)
            .scalar()
            or 0
        )
        farm_kpis = {
            "avg_milk_per_cow": round(float(avg_milk), 1),
        }
        cows_critical = data.get("stats", {}).get("critical_cases", 0)
        if cows_critical > 0:
            farm_kpis["avg_open_days"] = cows_critical
        comparison = RegionalBenchmarkingService.compare_with_region(farm_kpis)
        return comparison, 200


@ns.route("/advisor")
class DigitalAdvisor(Resource):
    @jwt_required()
    def get(self):
        """Obtiene recomendaciones personalizadas del asesor digital."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        recommendations = DigitalAdvisorService.generate_recommendations(
            user_finca.finca_id
        )
        return recommendations, 200


@ns.route("/animal/<int:animal_id>")
class AnimalIntelligence(Resource):
    @jwt_required()
    @ns.doc("get_animal_intelligence")
    def get(self, animal_id):
        """Obtiene KPIs detallados de inteligencia para un animal específico."""
        from app.models.animals import Animals

        animal = Animals.query.get_or_404(animal_id)

        kpis = FarmingIntelligenceService.get_animal_kpis(animal)
        return kpis, 200


@ns.route("/tips")
class CampesinoTips(Resource):
    @jwt_required()
    def get(self):
        """Tips rotativos para el dashboard campesino desde BD."""
        entry = SystemContent.get_by_key("campesino.tips")
        if entry and entry.extra:
            return entry.extra, 200
        return [], 200
