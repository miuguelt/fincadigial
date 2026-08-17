"""Valores mínimos que deben existir en cada finca."""

from __future__ import annotations

from datetime import date

from app import db
from app.models.fields import Fields, LandStatus
from app.models.foodTypes import FoodTypes
from app.models.seasonal_adjustments import SeasonalAdjustment
from app.services.default_alert_configs import seed_default_configs_for_finca
from app.services.catalog_initializer import seed_catalogs_for_finca


def _ensure_food_and_fields(finca_id: int) -> None:
    foods = (
        ("Pasto Kikuyo", "Pastoreo directo", 1.0),
        ("Pasto Estrella", "Pastoreo rotacional", 1.0),
        ("Concentrado Lechería", "Suministro en sala", 0.5),
        ("Sal Mineralizada", "Consumo a voluntad", 0.2),
    )
    food_by_name: dict[str, FoodTypes] = {}
    for name, management, area in foods:
        item = FoodTypes.query.filter_by(food_type=name, finca_id=finca_id).first()
        if not item:
            item = FoodTypes(
                food_type=name,
                handlings=management,
                sowing_date=date(2023, 1, 1),
                area=area,
                gauges="Base de finca",
                finca_id=finca_id,
            )
            db.session.add(item)
            db.session.flush()
        food_by_name[name] = item
    fields = (
        ("Potrero Principal", "2.5", LandStatus.Activo, "Pasto Kikuyo"),
        ("Potrero de Reserva", "1.5", LandStatus.Disponible, "Pasto Estrella"),
    )
    for name, area, state, food_name in fields:
        if not Fields.query.filter_by(name=name, finca_id=finca_id).first():
            db.session.add(
                Fields(
                    name=name,
                    finca_id=finca_id,
                    area=area,
                    state=state,
                    food_type_id=food_by_name[food_name].id,
                )
            )


def _ensure_seasonal_adjustments(finca_id: int) -> int:
    created = 0
    for month in range(1, 13):
        if SeasonalAdjustment.query.filter_by(finca_id=finca_id, month=month).first():
            continue
        dry = month in {1, 2, 3, 7, 8}
        db.session.add(
            SeasonalAdjustment(
                finca_id=finca_id,
                month=month,
                adg_multiplier=0.85 if dry else 1.0,
                pasture_quality_index=0.55 if dry else 0.8,
                milk_production_multiplier=0.9 if dry else 1.0,
                heat_stress_risk="medio" if dry else "bajo",
                description="Ajuste base para época seca" if dry else "Ajuste base para lluvias",
            )
        )
        created += 1
    return created


def seed_finca_baseline(finca_id: int) -> dict[str, int]:
    seed_catalogs_for_finca(finca_id)
    seed_default_configs_for_finca(finca_id)
    _ensure_food_and_fields(finca_id)
    seasonal = _ensure_seasonal_adjustments(finca_id)
    db.session.commit()
    return {"seasonal_adjustments": seasonal}


def seed_all_finca_baselines() -> dict[str, int]:
    from app.models.finca import Finca

    total = {"fincas": 0, "seasonal_adjustments": 0}
    for finca in Finca.query.order_by(Finca.id).all():
        result = seed_finca_baseline(finca.id)
        total["fincas"] += 1
        total["seasonal_adjustments"] += result["seasonal_adjustments"]
    return total
