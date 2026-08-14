"""Generation of tenant-scoped, database-backed custom analytical reports."""

from datetime import date, datetime, timedelta

from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Resource
from sqlalchemy import func

from app import db
from app.models.animals import AnimalStatus, Animals, Sex
from app.models.animalFields import AnimalFields
from app.models.breeds import Breeds
from app.models.campesino import CropActivity
from app.models.control import Control
from app.models.fields import Fields
from app.models.financial import Transaction, TransactionType
from app.models.inventory import InventoryLot
from app.models.milk_production import MilkProduction
from app.models.species import Species
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from . import analytics_ns


PERIOD_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "2y": 730,
}

METRIC_ALIASES = {
    "financial": "finance",
    "finanzas": "finance",
    "inventory": "inventory",
    "inventario": "inventory",
    "animals": "animals",
    "health": "health",
    "production": "production",
    "fields": "fields",
    "finance": "finance",
    "milk": "milk",
    "agriculture": "agriculture",
}


def _enum_value(value):
    """Return a stable API value for SQLAlchemy enum instances."""
    return getattr(value, "value", value)


def _number(value, default=0.0):
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _parse_enum(enum_cls, value, label):
    values = value if isinstance(value, list) else [value]
    parsed = []
    for item in values:
        if isinstance(item, enum_cls):
            parsed.append(item)
            continue
        try:
            parsed.append(enum_cls(item))
            continue
        except (TypeError, ValueError):
            pass
        try:
            parsed.append(enum_cls[str(item)])
        except (KeyError, TypeError):
            raise ValueError(f"Filtro inválido para {label}: {item}") from None
    return parsed


def _parse_int_filter(value, label):
    values = value if isinstance(value, list) else [value]
    try:
        return [int(item) for item in values]
    except (TypeError, ValueError):
        raise ValueError(f"Filtro inválido para {label}") from None


@analytics_ns.route("/reports/custom")
class CustomReports(Resource):
    @jwt_required()
    def post(self):
        """Generate a custom report using only records from the active farm."""
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error("No hay finca seleccionada", status_code=400)

            payload = request.get_json(silent=True) or {}
            period = payload.get("period", "1y")
            if period not in (*PERIOD_DAYS, "all"):
                return APIResponse.error("Período de reporte inválido", status_code=400)

            raw_metrics = payload.get("metrics", ["animals"])
            raw_metrics = [raw_metrics] if isinstance(raw_metrics, str) else raw_metrics
            metrics = list(dict.fromkeys(METRIC_ALIASES.get(str(metric), str(metric)) for metric in raw_metrics))
            supported_metrics = set(METRIC_ALIASES.values())
            if not metrics or any(metric not in supported_metrics for metric in metrics):
                return APIResponse.error("La selección de métricas no es válida", status_code=400)

            group_by = payload.get("groupBy", []) or []
            group_by = [group_by] if isinstance(group_by, str) else list(dict.fromkeys(group_by))
            supported_groups = {"breed", "field", "species", "month", "health_status"}
            invalid_groups = [group for group in group_by if group not in supported_groups]
            if invalid_groups:
                return APIResponse.error("El agrupamiento seleccionado no es válido", status_code=400)

            filters = payload.get("filters", {}) or {}
            if not isinstance(filters, dict):
                return APIResponse.error("Los filtros del reporte no son válidos", status_code=400)

            today = date.today()
            now = datetime.now()
            start_date = (
                today - timedelta(days=PERIOD_DAYS[period])
                if period != "all"
                else date(2000, 1, 1)
            )

            # The explicit finca predicate is kept on every query as a defense in depth
            # measure, even though the tenant context also applies a scoped query.
            animal_statuses = _parse_enum(AnimalStatus, filters["status"], "estado") if "status" in filters else []
            animal_sexes = _parse_enum(Sex, filters["sex"], "sexo") if "sex" in filters else []
            breed_ids = _parse_int_filter(filters["breed_id"], "raza") if "breed_id" in filters else []
            if "breeds_id" in filters:
                breed_ids = _parse_int_filter(filters["breeds_id"], "raza")

            def scoped_animals(query):
                query = query.filter(
                    Animals.finca_id == finca_id,
                    Animals.is_deleted.is_(False),
                )
                if animal_statuses:
                    query = query.filter(Animals.status.in_(animal_statuses))
                if animal_sexes:
                    query = query.filter(Animals.sex.in_(animal_sexes))
                if breed_ids:
                    query = query.filter(Animals.breeds_id.in_(breed_ids))
                return query

            report_data = {
                "period": period,
                "period_start": start_date.isoformat(),
                "period_end": today.isoformat(),
                "generated_at": now.isoformat(),
                "metrics_included": metrics,
                "group_by": group_by,
                "filters_applied": filters,
                "summary": {},
                "details": {},
            }

            if "animals" in metrics:
                animals_query = scoped_animals(Animals.query)
                status_counts = {
                    "vivos": animals_query.filter(Animals.status == AnimalStatus.Vivo).count(),
                    "vendidos": animals_query.filter(Animals.status == AnimalStatus.Vendido).count(),
                    "muertos": animals_query.filter(Animals.status == AnimalStatus.Muerto).count(),
                }
                sex_counts = {
                    "machos_vivos": animals_query.filter(
                        Animals.status == AnimalStatus.Vivo, Animals.sex == Sex.Macho
                    ).count(),
                    "hembras_vivas": animals_query.filter(
                        Animals.status == AnimalStatus.Vivo, Animals.sex == Sex.Hembra
                    ).count(),
                }
                report_data["summary"].update(
                    {
                        "animales_totales": animals_query.count(),
                        "animales_activos_vivos": status_counts["vivos"],
                        "machos_activos": sex_counts["machos_vivos"],
                        "hembras_activas": sex_counts["hembras_vivas"],
                    }
                )

                breed_query = (
                    db.session.query(Breeds.name, func.count(Animals.id))
                    .join(Animals, Animals.breeds_id == Breeds.id)
                    .filter(Breeds.is_deleted.is_(False), Animals.status == AnimalStatus.Vivo)
                )
                breed_query = scoped_animals(breed_query).group_by(Breeds.name)
                breed_rows = breed_query.all()
                report_data["details"]["inventario_animales"] = {
                    "total": animals_query.count(),
                    "estados": status_counts,
                    "sexo": sex_counts,
                }
                report_data["details"]["distribucion_razas"] = {
                    name: count for name, count in breed_rows
                }

            if "health" in metrics:
                vaccination_query = Vaccinations.query.filter(
                    Vaccinations.finca_id == finca_id,
                    Vaccinations.vaccination_date >= start_date,
                    Vaccinations.vaccination_date <= today,
                    Vaccinations.is_deleted.is_(False),
                )
                treatment_query = Treatments.query.filter(
                    Treatments.finca_id == finca_id,
                    Treatments.treatment_date >= start_date,
                    Treatments.treatment_date <= today,
                    Treatments.is_deleted.is_(False),
                )
                vaccinations_count = vaccination_query.count()
                treatments_count = treatment_query.count()
                recent_treatments = treatment_query.order_by(Treatments.treatment_date.desc()).limit(10).all()
                report_data["summary"].update(
                    {
                        "total_vacunaciones_periodo": vaccinations_count,
                        "total_tratamientos_periodo": treatments_count,
                    }
                )
                report_data["details"]["historial_salud"] = {
                    "total_vacunaciones": vaccinations_count,
                    "total_tratamientos": treatments_count,
                    "ultimos_tratamientos": [
                        {
                            "fecha": item.treatment_date.isoformat() if item.treatment_date else "",
                            "descripcion": item.description or "Sin descripción",
                            "dosis": item.dosis or "N/A",
                            "observaciones": item.observations or "",
                        }
                        for item in recent_treatments
                    ],
                }

            if "production" in metrics:
                controls_query = Control.query.filter(
                    Control.finca_id == finca_id,
                    Control.checkup_date >= start_date,
                    Control.checkup_date <= today,
                    Control.is_deleted.is_(False),
                )
                controls_count = controls_query.count()
                avg_weight = (
                    scoped_animals(Animals.query)
                    .filter(Animals.status == AnimalStatus.Vivo)
                    .with_entities(func.avg(Animals.weight))
                    .scalar()
                )
                recent_controls = controls_query.order_by(Control.checkup_date.desc()).limit(10).all()
                report_data["summary"].update(
                    {
                        "total_controles_periodo": controls_count,
                        "peso_promedio_kg": round(_number(avg_weight), 2),
                    }
                )
                report_data["details"]["produccion_y_biometria"] = {
                    "total_controles": controls_count,
                    "peso_promedio_general_kg": round(_number(avg_weight), 2),
                    "ultimos_controles": [
                        {
                            "fecha": item.checkup_date.isoformat() if item.checkup_date else "",
                            "peso_kg": _number(item.weight),
                            "altura_cm": _number(item.height),
                            "estado_salud": _enum_value(item.health_status),
                        }
                        for item in recent_controls
                    ],
                }

            if "fields" in metrics:
                fields_query = Fields.query.filter(
                    Fields.finca_id == finca_id,
                    Fields.is_deleted.is_(False),
                )
                fields = fields_query.order_by(Fields.name.asc()).all()
                total_area = sum(_number(field.area) for field in fields)
                report_data["summary"].update(
                    {
                        "total_potreros": len(fields),
                        "area_total_hectareas": round(total_area, 2),
                    }
                )
                report_data["details"]["gestion_potreros"] = {
                    "total_potreros": len(fields),
                    "area_total_ha": round(total_area, 2),
                    "potreros": [
                        {
                            "nombre": field.name,
                            "capacidad_cabezas": field.capacity or "0",
                            "estado": _enum_value(field.state),
                            "area_ha": field.area or "0",
                            "ubicacion": field.ubication or "Sin especificar",
                        }
                        for field in fields
                    ],
                }

            if "finance" in metrics:
                transactions_query = Transaction.query.filter(
                    Transaction.finca_id == finca_id,
                    Transaction.date >= start_date,
                    Transaction.date <= today,
                    Transaction.is_deleted.is_(False),
                )
                income = _number(
                    transactions_query.filter(Transaction.transaction_type == TransactionType.Income)
                    .with_entities(func.coalesce(func.sum(Transaction.amount), 0))
                    .scalar()
                )
                expenses = _number(
                    transactions_query.filter(Transaction.transaction_type == TransactionType.Expense)
                    .with_entities(func.coalesce(func.sum(Transaction.amount), 0))
                    .scalar()
                )
                transaction_count = transactions_query.count()
                transactions = transactions_query.order_by(Transaction.date.desc()).limit(15).all()
                transactions_for_group = transactions_query.all() if "month" in group_by else []
                balance = income - expenses
                report_data["summary"].update(
                    {
                        "ingresos_totales": round(income, 2),
                        "egresos_totales": round(expenses, 2),
                        "balance_financiero": round(balance, 2),
                    }
                )
                report_data["details"]["finanzas_y_economia"] = {
                    "total_transacciones": transaction_count,
                    "ingresos": round(income, 2),
                    "egresos": round(expenses, 2),
                    "balance": round(balance, 2),
                    "ultimos_movimientos": [
                        {
                            "fecha": item.date.isoformat() if item.date else "",
                            "tipo": _enum_value(item.transaction_type),
                            "categoria": _enum_value(item.category),
                            "monto": round(_number(item.amount), 2),
                            "descripcion": item.description or "",
                        }
                        for item in transactions[:15]
                    ],
                }

            if "milk" in metrics:
                milk_query = MilkProduction.query.filter(
                    MilkProduction.finca_id == finca_id,
                    MilkProduction.date >= start_date,
                    MilkProduction.date <= today,
                    MilkProduction.is_deleted.is_(False),
                )
                total_liters = _number(
                    milk_query.with_entities(func.coalesce(func.sum(MilkProduction.liters), 0)).scalar()
                )
                milk_count = milk_query.count()
                milk_records = milk_query.order_by(MilkProduction.date.desc()).limit(15).all()
                milk_records_for_group = milk_query.all() if "month" in group_by else []
                report_data["summary"].update(
                    {
                        "total_leche_litros": round(total_liters, 2),
                        "total_ordenos": milk_count,
                    }
                )
                report_data["details"]["produccion_lechera"] = {
                    "total_litros": round(total_liters, 2),
                    "total_registros": milk_count,
                    "ultimos_ordenos": [
                        {
                            "fecha": item.date.isoformat() if item.date else "",
                            "jornada": _enum_value(item.milking_session),
                            "litros": round(_number(item.liters), 2),
                            "observaciones": item.notes or "",
                        }
                        for item in milk_records[:15]
                    ],
                }

            if "agriculture" in metrics:
                crop_query = CropActivity.query.filter(
                    CropActivity.finca_id == finca_id,
                    CropActivity.activity_date >= start_date,
                    CropActivity.activity_date <= today,
                    CropActivity.is_deleted.is_(False),
                )
                crop_records = crop_query.order_by(CropActivity.activity_date.desc()).all()
                report_data["summary"]["actividades_agricolas_periodo"] = len(crop_records)
                report_data["details"]["actividades_agricolas"] = {
                    "total_actividades": len(crop_records),
                    "ultimas_actividades": [
                        {
                            "fecha": item.activity_date.isoformat() if item.activity_date else "",
                            "tipo": _enum_value(item.activity_type),
                            "cultivo": getattr(item.crop_plot, "crop_name", None) or "Sin cultivo",
                            "costo": round(_number(item.cost), 2),
                            "observaciones": item.notes or item.description or "",
                        }
                        for item in crop_records[:15]
                    ],
                }

            if "inventory" in metrics:
                inventory_query = InventoryLot.query.filter(
                    InventoryLot.finca_id == finca_id,
                    InventoryLot.is_deleted.is_(False),
                )
                lots = inventory_query.order_by(InventoryLot.expiry_date.asc()).all()
                total_units = sum(item.current_quantity or 0 for item in lots)
                low_stock = sum(1 for item in lots if item.is_low_stock)
                expired = sum(1 for item in lots if item.is_expired)
                inventory_value = sum(
                    _number(item.current_quantity) * _number(item.unit_cost) for item in lots
                )
                report_data["summary"].update(
                    {
                        "lotes_inventario": len(lots),
                        "unidades_disponibles": total_units,
                        "inventario_bajo_stock": low_stock,
                        "inventario_vencido": expired,
                        "valor_inventario_cop": round(inventory_value, 2),
                    }
                )
                report_data["details"]["inventario_insumos"] = {
                    "total_lotes": len(lots),
                    "unidades_disponibles": total_units,
                    "bajo_stock": low_stock,
                    "vencidos": expired,
                    "valor_total_cop": round(inventory_value, 2),
                    "lotes": [
                        {
                            "producto": item.product_name or _enum_value(item.product_type),
                            "lote": item.lot_number,
                            "cantidad": item.current_quantity,
                            "unidad": item.unit,
                            "vencimiento": item.expiry_date.isoformat() if item.expiry_date else "",
                            "estado": "Vencido" if item.is_expired else ("Bajo stock" if item.is_low_stock else "Disponible"),
                        }
                        for item in lots[:15]
                    ],
                }

            grouped = {}
            if "breed" in group_by and "animals" in metrics:
                grouped["breed"] = dict(breed_rows)
            if "species" in group_by and "animals" in metrics:
                species_rows = (
                    db.session.query(Species.name, func.count(Animals.id))
                    .join(Breeds, Breeds.species_id == Species.id)
                    .join(Animals, Animals.breeds_id == Breeds.id)
                    .filter(Species.is_deleted.is_(False), Breeds.is_deleted.is_(False))
                )
                species_rows = scoped_animals(species_rows).group_by(Species.name).all()
                grouped["species"] = dict(species_rows)
            if "field" in group_by and "animals" in metrics:
                field_rows = (
                    db.session.query(Fields.name, func.count(AnimalFields.animal_id))
                    .join(AnimalFields, AnimalFields.field_id == Fields.id)
                    .join(Animals, Animals.id == AnimalFields.animal_id)
                    .filter(
                        Fields.finca_id == finca_id,
                        Fields.is_deleted.is_(False),
                        AnimalFields.finca_id == finca_id,
                        AnimalFields.removal_date.is_(None),
                        AnimalFields.is_deleted.is_(False),
                    )
                )
                field_rows = scoped_animals(field_rows).group_by(Fields.name).all()
                grouped["field"] = dict(field_rows)
            if "health_status" in group_by and {"health", "production"}.intersection(metrics):
                health_rows = (
                    db.session.query(Control.health_status, func.count(Control.id))
                    .filter(
                        Control.finca_id == finca_id,
                        Control.checkup_date >= start_date,
                        Control.checkup_date <= today,
                        Control.is_deleted.is_(False),
                    )
                    .group_by(Control.health_status)
                    .all()
                )
                grouped["health_status"] = {_enum_value(name): count for name, count in health_rows}
            if "month" in group_by:
                month_counts = {}

                def add_months(records, field_name):
                    for record in records:
                        record_date = getattr(record, field_name, None)
                        if record_date:
                            month = record_date.strftime("%Y-%m")
                            month_counts[month] = month_counts.get(month, 0) + 1

                if "health" in metrics:
                    add_months(vaccination_query.all(), "vaccination_date")
                    add_months(treatment_query.all(), "treatment_date")
                if "production" in metrics:
                    add_months(controls_query.all(), "checkup_date")
                if "finance" in metrics:
                    add_months(transactions_for_group, "date")
                if "milk" in metrics:
                    add_months(milk_records_for_group, "date")
                if "agriculture" in metrics:
                    add_months(crop_records, "activity_date")
                grouped["month"] = dict(sorted(month_counts.items()))
            if grouped:
                report_data["details"]["agrupaciones"] = grouped

            identity = get_jwt_identity()
            user_name = identity.get("fullname", "Usuario") if isinstance(identity, dict) else str(identity)
            return APIResponse.success(
                {
                    "report": report_data,
                    "metadata": {
                        "generated_at": now.isoformat(),
                        "user": user_name,
                        "finca_id": finca_id,
                    },
                }
            )
        except ValueError as error:
            return APIResponse.error(str(error), status_code=400)
        except Exception:
            # Do not expose model/database internals to the browser. The server log contains
            # the traceback for diagnosis while the operator receives an actionable message.
            import logging

            logging.getLogger(__name__).exception("Error generando reporte personalizado")
            return APIResponse.error("No fue posible generar el reporte con los datos actuales")
