from sqlalchemy import func, extract
from datetime import datetime, timedelta
from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.control import Control
from app.models.breeds import Breeds
import logging
import decimal

logger = logging.getLogger(__name__)


class ProductionAnalyticsService:
    @staticmethod
    def get_weight_trends(period="1y"):
        period_days = {"6m": 180, "1y": 365, "2y": 730}
        start_date = datetime.now() - timedelta(days=period_days.get(period, 365))

        from app.utils.tenant_context import get_current_finca_id

        finca_id = get_current_finca_id()

        trends = (
            db.session.query(
                extract("year", Control.checkup_date).label("year"),
                extract("month", Control.checkup_date).label("month"),
                func.avg(Control.weight).label("avg_weight"),
                func.count(Control.id).label("count"),
            )
            .join(Animals, Animals.id == Control.animal_id)
            .filter(
                Control.finca_id == finca_id,
                Control.checkup_date >= start_date,
                Animals.status == AnimalStatus.Vivo,
            )
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )

        return [
            {
                "period": f"{int(t.year)}-{int(t.month):02d}",
                "avg_weight": float(t.avg_weight)
                if isinstance(t.avg_weight, decimal.Decimal)
                else t.avg_weight,
                "sample_size": t.count,
            }
            for t in trends
        ]

    @staticmethod
    def get_animal_distribution(group_by="breed"):
        from app.utils.tenant_context import get_current_finca_id

        finca_id = get_current_finca_id()

        if group_by == "breed":
            stats = (
                db.session.query(Breeds.name, func.count(Animals.id))
                .join(Animals)
                .filter(Animals.finca_id == finca_id)
                .group_by(Breeds.name)
                .all()
            )
            return [{"label": name, "count": count} for name, count in stats]

        elif group_by == "sex":
            stats = (
                db.session.query(Animals.sex, func.count(Animals.id))
                .filter(Animals.finca_id == finca_id)
                .group_by(Animals.sex)
                .all()
            )
            return [
                {"label": s.value if hasattr(s, "value") else str(s), "count": count}
                for s, count in stats
            ]

        return []
