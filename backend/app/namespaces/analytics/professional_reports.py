from flask import make_response
from flask_restx import Resource, Namespace
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.pdf_report_service import (
    generate_animal_cv_pdf,
    generate_financial_statement_pdf,
)
from app.services.analytics.farming_intelligence_service import (
    FarmingIntelligenceService,
)
from app.models.animals import Animals
from app.models.reproduction import ReproductiveEvent
from app.models.user_finca import UserFinca
from app.models.finca import Finca

ns = Namespace(
    "reports_pro", description="Reportes profesionales en PDF para bancos y compradores"
)


@ns.route("/animal-cv/<int:animal_id>")
class AnimalCVReport(Resource):
    @jwt_required()
    def get(self, animal_id):
        """Genera la Hoja de Vida profesional de un animal en PDF."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca:
            return {"message": "Finca no activa"}, 400

        finca = Finca.query.get(user_finca.finca_id)
        animal = Animals.query.get_or_404(animal_id)

        # Recopilar datos
        kpis = FarmingIntelligenceService.get_animal_kpis(animal)
        repro_events = (
            ReproductiveEvent.query.filter_by(animal_id=animal.id)
            .order_by(ReproductiveEvent.event_date.desc())
            .all()
        )

        repro_history = []
        for e in repro_events:
            repro_history.append(
                {
                    "fecha": e.event_date.strftime("%Y-%m-%d"),
                    "evento": str(e.event_type.value),
                    "toro/cría": "-",  # Simplificado
                    "detalle": e.observations or "-",
                }
            )

        pdf_content = generate_animal_cv_pdf(
            finca.name, animal.to_namespace_dict(), kpis, repro_history[:10]
        )

        response = make_response(pdf_content)
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = (
            f"attachment; filename=hoja_vida_{animal.record}.pdf"
        )
        return response


@ns.route("/financial-statement")
class FinancialStatementReport(Resource):
    @jwt_required()
    def get(self):
        """Genera el Estado de Cuenta Campesino en PDF."""
        user_id = get_jwt_identity()
        user_finca = UserFinca.query.filter_by(user_id=user_id, is_active=True).first()
        if not user_finca:
            return {"message": "Finca no activa"}, 400

        finca = Finca.query.get(user_finca.finca_id)

        from app.models.production_finance import FarmExpenses

        items = (
            FarmExpenses.query.filter_by(finca_id=finca.id)
            .order_by(FarmExpenses.expense_date.desc())
            .all()
        )

        income = sum(i.amount for i in items if i.is_income)
        expenses = sum(i.amount for i in items if not i.is_income)

        financial_data = {
            "balance": income - expenses,
            "total_income": income,
            "total_expenses": expenses,
            "history": [i.to_namespace_dict() for i in items],
        }

        pdf_content = generate_financial_statement_pdf(finca.name, financial_data)

        response = make_response(pdf_content)
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = (
            "attachment; filename=estado_cuenta_campesino.pdf"
        )
        return response
