"""One builder per metric of the custom report.

Each builder returns what it contributes to the report — a slice of `summary`,
a block of `details` and the rows the grouping step may need — instead of
mutating a shared dictionary. The rows are only materialised when the request
actually groups by month; otherwise the report would load every transaction of
the period just to throw it away.
"""

from dataclasses import dataclass, field

from sqlalchemy import func

from app import db

# Cuántos registros recientes se muestran en cada bloque de detalle.
_RECENT_ROWS = 15
_RECENT_CLINICAL_ROWS = 10


@dataclass
class Section:
    """Aporte de una métrica al reporte."""

    summary: dict = field(default_factory=dict)
    detail_key: str | None = None
    detail: dict = field(default_factory=dict)
    # Bloques de detalle adicionales que no caben bajo una sola clave.
    extra_details: dict = field(default_factory=dict)
    # Filas por campo de fecha, para el agrupamiento por mes.
    month_rows: dict[str, list] = field(default_factory=dict)
    # Conteos por raza, reutilizados por el agrupamiento por raza.
    breed_rows: list = field(default_factory=list)


def enum_value(value):
    """Valor estable de un enum de SQLAlchemy para la API."""
    return getattr(value, "value", value)


def number(value, default=0.0):
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def build_animals(ctx) -> Section:
    from app.models.animals import AnimalStatus, Animals, Sex
    from app.models.breeds import Breeds

    animals = ctx.scoped_animals(Animals.query)
    statuses = {
        "vivos": animals.filter(Animals.status == AnimalStatus.Vivo).count(),
        "vendidos": animals.filter(Animals.status == AnimalStatus.Vendido).count(),
        "muertos": animals.filter(Animals.status == AnimalStatus.Muerto).count(),
    }
    sexes = {
        "machos_vivos": animals.filter(
            Animals.status == AnimalStatus.Vivo, Animals.sex == Sex.Macho
        ).count(),
        "hembras_vivas": animals.filter(
            Animals.status == AnimalStatus.Vivo, Animals.sex == Sex.Hembra
        ).count(),
    }
    total = animals.count()

    breed_query = (
        db.session.query(Breeds.name, func.count(Animals.id))
        .join(Animals, Animals.breeds_id == Breeds.id)
        .filter(Breeds.is_deleted.is_(False), Animals.status == AnimalStatus.Vivo)
    )
    breed_rows = ctx.scoped_animals(breed_query).group_by(Breeds.name).all()

    return Section(
        summary={
            "animales_totales": total,
            "animales_activos_vivos": statuses["vivos"],
            "machos_activos": sexes["machos_vivos"],
            "hembras_activas": sexes["hembras_vivas"],
        },
        detail_key="inventario_animales",
        detail={"total": total, "estados": statuses, "sexo": sexes},
        extra_details={"distribucion_razas": dict(breed_rows)},
        breed_rows=breed_rows,
    )


def build_health(ctx) -> Section:
    from app.models.treatments import Treatments
    from app.models.vaccinations import Vaccinations

    vaccinations = Vaccinations.query.filter(
        Vaccinations.finca_id == ctx.finca_id,
        Vaccinations.vaccination_date >= ctx.spec.start_date,
        Vaccinations.vaccination_date <= ctx.spec.end_date,
        Vaccinations.is_deleted.is_(False),
    )
    treatments = Treatments.query.filter(
        Treatments.finca_id == ctx.finca_id,
        Treatments.treatment_date >= ctx.spec.start_date,
        Treatments.treatment_date <= ctx.spec.end_date,
        Treatments.is_deleted.is_(False),
    )
    vaccinations_count = vaccinations.count()
    treatments_count = treatments.count()
    recent = (
        treatments.order_by(Treatments.treatment_date.desc())
        .limit(_RECENT_CLINICAL_ROWS)
        .all()
    )

    return Section(
        summary={
            "total_vacunaciones_periodo": vaccinations_count,
            "total_tratamientos_periodo": treatments_count,
        },
        detail_key="historial_salud",
        detail={
            "total_vacunaciones": vaccinations_count,
            "total_tratamientos": treatments_count,
            "ultimos_tratamientos": [
                {
                    "fecha": item.treatment_date.isoformat()
                    if item.treatment_date
                    else "",
                    "descripcion": item.description or "Sin descripción",
                    "dosis": item.dosis or "N/A",
                    "observaciones": item.observations or "",
                }
                for item in recent
            ],
        },
        month_rows={
            "vaccination_date": ctx.rows_for_month(vaccinations),
            "treatment_date": ctx.rows_for_month(treatments),
        },
    )


def build_production(ctx) -> Section:
    from app.models.animals import AnimalStatus, Animals
    from app.models.control import Control

    controls = Control.query.filter(
        Control.finca_id == ctx.finca_id,
        Control.checkup_date >= ctx.spec.start_date,
        Control.checkup_date <= ctx.spec.end_date,
        Control.is_deleted.is_(False),
    )
    count = controls.count()
    avg_weight = round(
        number(
            ctx.scoped_animals(Animals.query)
            .filter(Animals.status == AnimalStatus.Vivo)
            .with_entities(func.avg(Animals.weight))
            .scalar()
        ),
        2,
    )
    recent = (
        controls.order_by(Control.checkup_date.desc())
        .limit(_RECENT_CLINICAL_ROWS)
        .all()
    )

    return Section(
        summary={"total_controles_periodo": count, "peso_promedio_kg": avg_weight},
        detail_key="produccion_y_biometria",
        detail={
            "total_controles": count,
            "peso_promedio_general_kg": avg_weight,
            "ultimos_controles": [
                {
                    "fecha": item.checkup_date.isoformat() if item.checkup_date else "",
                    "peso_kg": number(item.weight),
                    "altura_cm": number(item.height),
                    "estado_salud": enum_value(item.health_status),
                }
                for item in recent
            ],
        },
        month_rows={"checkup_date": ctx.rows_for_month(controls)},
    )


def build_fields(ctx) -> Section:
    from app.models.fields import Fields

    fields = (
        Fields.query.filter(
            Fields.finca_id == ctx.finca_id, Fields.is_deleted.is_(False)
        )
        .order_by(Fields.name.asc())
        .all()
    )
    total_area = round(sum(number(item.area) for item in fields), 2)

    return Section(
        summary={"total_potreros": len(fields), "area_total_hectareas": total_area},
        detail_key="gestion_potreros",
        detail={
            "total_potreros": len(fields),
            "area_total_ha": total_area,
            "potreros": [
                {
                    "nombre": item.name,
                    "capacidad_cabezas": item.capacity or "0",
                    "estado": enum_value(item.state),
                    "area_ha": item.area or "0",
                    "ubicacion": item.ubication or "Sin especificar",
                }
                for item in fields
            ],
        },
    )


def build_finance(ctx) -> Section:
    from app.models.financial import Transaction, TransactionType
    from app.utils.financial_filters import exclude_simulated_transactions

    transactions = exclude_simulated_transactions(
        Transaction.query.filter(
            Transaction.finca_id == ctx.finca_id,
            Transaction.date >= ctx.spec.start_date,
            Transaction.date <= ctx.spec.end_date,
            Transaction.is_deleted.is_(False),
        ),
        Transaction,
    )

    def total_for(kind):
        return number(
            transactions.filter(Transaction.transaction_type == kind)
            .with_entities(func.coalesce(func.sum(Transaction.amount), 0))
            .scalar()
        )

    income = round(total_for(TransactionType.Income), 2)
    expenses = round(total_for(TransactionType.Expense), 2)
    balance = round(income - expenses, 2)
    count = transactions.count()
    recent = transactions.order_by(Transaction.date.desc()).limit(_RECENT_ROWS).all()

    return Section(
        summary={
            "ingresos_totales": income,
            "egresos_totales": expenses,
            "balance_financiero": balance,
        },
        detail_key="finanzas_y_economia",
        detail={
            "total_transacciones": count,
            "ingresos": income,
            "egresos": expenses,
            "balance": balance,
            "ultimos_movimientos": [
                {
                    "fecha": item.date.isoformat() if item.date else "",
                    "tipo": enum_value(item.transaction_type),
                    "categoria": enum_value(item.category),
                    "monto": round(number(item.amount), 2),
                    "descripcion": item.description or "",
                }
                for item in recent
            ],
        },
        month_rows={"date": ctx.rows_for_month(transactions)},
    )


def build_milk(ctx) -> Section:
    from app.models.milk_production import MilkProduction

    records = MilkProduction.query.filter(
        MilkProduction.finca_id == ctx.finca_id,
        MilkProduction.date >= ctx.spec.start_date,
        MilkProduction.date <= ctx.spec.end_date,
        MilkProduction.is_deleted.is_(False),
    )
    liters = round(
        number(
            records.with_entities(
                func.coalesce(func.sum(MilkProduction.liters), 0)
            ).scalar()
        ),
        2,
    )
    count = records.count()
    recent = records.order_by(MilkProduction.date.desc()).limit(_RECENT_ROWS).all()

    return Section(
        summary={"total_leche_litros": liters, "total_ordenos": count},
        detail_key="produccion_lechera",
        detail={
            "total_litros": liters,
            "total_registros": count,
            "ultimos_ordenos": [
                {
                    "fecha": item.date.isoformat() if item.date else "",
                    "jornada": enum_value(item.milking_session),
                    "litros": round(number(item.liters), 2),
                    "observaciones": item.notes or "",
                }
                for item in recent
            ],
        },
        month_rows={"date": ctx.rows_for_month(records)},
    )


def build_agriculture(ctx) -> Section:
    from app.models.campesino import CropActivity

    records = (
        CropActivity.query.filter(
            CropActivity.finca_id == ctx.finca_id,
            CropActivity.activity_date >= ctx.spec.start_date,
            CropActivity.activity_date <= ctx.spec.end_date,
            CropActivity.is_deleted.is_(False),
        )
        .order_by(CropActivity.activity_date.desc())
        .all()
    )

    return Section(
        summary={"actividades_agricolas_periodo": len(records)},
        detail_key="actividades_agricolas",
        detail={
            "total_actividades": len(records),
            "ultimas_actividades": [
                {
                    "fecha": item.activity_date.isoformat()
                    if item.activity_date
                    else "",
                    "tipo": enum_value(item.activity_type),
                    "cultivo": getattr(item.crop_plot, "crop_name", None)
                    or "Sin cultivo",
                    "costo": round(number(item.cost), 2),
                    "observaciones": item.notes or item.description or "",
                }
                for item in records[:_RECENT_ROWS]
            ],
        },
        # Ya está materializado: agrupar por mes no cuesta otra consulta.
        month_rows={"activity_date": records},
    )


def build_inventory(ctx) -> Section:
    from app.models.inventory import InventoryLot

    lots = (
        InventoryLot.query.filter(
            InventoryLot.finca_id == ctx.finca_id,
            InventoryLot.is_deleted.is_(False),
        )
        .order_by(InventoryLot.expiry_date.asc())
        .all()
    )
    units = sum(item.current_quantity or 0 for item in lots)
    low_stock = sum(1 for item in lots if item.is_low_stock)
    expired = sum(1 for item in lots if item.is_expired)
    value = round(
        sum(number(item.current_quantity) * number(item.unit_cost) for item in lots), 2
    )

    def lot_state(item):
        if item.is_expired:
            return "Vencido"
        return "Bajo stock" if item.is_low_stock else "Disponible"

    return Section(
        summary={
            "lotes_inventario": len(lots),
            "unidades_disponibles": units,
            "inventario_bajo_stock": low_stock,
            "inventario_vencido": expired,
            "valor_inventario_cop": value,
        },
        detail_key="inventario_insumos",
        detail={
            "total_lotes": len(lots),
            "unidades_disponibles": units,
            "bajo_stock": low_stock,
            "vencidos": expired,
            "valor_total_cop": value,
            "lotes": [
                {
                    "producto": item.product_name or enum_value(item.product_type),
                    "lote": item.lot_number,
                    "cantidad": item.current_quantity,
                    "unidad": item.unit,
                    "vencimiento": item.expiry_date.isoformat()
                    if item.expiry_date
                    else "",
                    "estado": lot_state(item),
                }
                for item in lots[:_RECENT_ROWS]
            ],
        },
    )


BUILDERS = {
    "animals": build_animals,
    "health": build_health,
    "production": build_production,
    "fields": build_fields,
    "finance": build_finance,
    "milk": build_milk,
    "agriculture": build_agriculture,
    "inventory": build_inventory,
}
