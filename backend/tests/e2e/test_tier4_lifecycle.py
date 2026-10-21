"""
Tier 4: Real-World Livestock Lifecycle (Ciclos de Vida Ganaderos Reales)
========================================================================
Valida la jornada operativa completa de una res a través de sus fases zootécnicas:
1. Ingreso e Identificación formal en la finca.
2. Levante y pesajes periódicos con cálculo de Ganancia Diaria de Peso (ADG).
3. Transición reproductiva a lactancia activa (parto).
4. Producción lechera comercial regular.
5. Incidencia clínica y tratamiento veterinario con tiempo de retiro.
6. Cumplimiento de inocuidad: bloqueo y descarte de leche durante retiro.
7. Convalecencia superada: restitución del ordeño comercial.
8. Auditoría de trazabilidad integral e inmutable en la bitácora.
"""

from datetime import date, timedelta
import pytest
from app import db
from app.models.animals import Animals, Sex, AnimalStatus
from app.models.control import Control
from app.models.treatments import Treatments
from app.models.milk_production import MilkProduction, MilkSession
from app.models.animal_health_history import AnimalHealthHistory, HealthEventType
from app.models.base_model import ValidationError


class TestTier4RealWorldLivestockLifecycle:
    """Escenario E2E de ciclo de vida ganadero real."""

    def test_ciclo_de_vida_completo_novilla_a_produccion_y_sanidad(self, app, client, auth_headers, livestock_setup):
        """Ejecuta el ciclo de vida continuo verificando coherencia de estados en cada transición."""
        with app.app_context():
            finca_id = livestock_setup["finca_id"]
            breed_id = livestock_setup["breed_dairy_id"]

            base_date = date.today() - timedelta(days=90)

            # =================================================================
            # FASE 1: Ingreso e Identificación Zootécnica
            # =================================================================
            vaca = Animals.create(
                record="BOV-LC-2026",
                breeds_id=breed_id,
                sex=Sex.Hembra,
                status=AnimalStatus.Vivo,
                birth_date=base_date - timedelta(days=600),
                weight=360.0,
                finca_id=finca_id,
                is_lactating=False,
            )
            assert vaca.id is not None
            assert vaca.weight == 360.0
            assert vaca.is_lactating is False

            # =================================================================
            # FASE 2: Levante y Controles Periódicos de Peso (Cálculo de ADG)
            # =================================================================
            # Pesaje Día 0 (hace 90 días): 360.0 kg
            fecha_p0 = base_date
            c0 = Control.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                checkup_date=fecha_p0.isoformat(),
                weight=360.0,
                health_status="Sano",
                description="Pesaje de ingreso",
            )
            assert c0.id is not None

            # Pesaje Día 30 (hace 60 días): 381.0 kg
            fecha_p30 = base_date + timedelta(days=30)
            c30 = Control.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                checkup_date=fecha_p30.isoformat(),
                weight=381.0,
                health_status="Sano",
                description="Control de levante mes 1",
            )
            adg_mes1 = round((c30.weight - c0.weight) / (fecha_p30 - fecha_p0).days, 3)
            assert adg_mes1 == 0.700  # +700 g/día

            # Pesaje Día 60 (hace 30 días): 405.0 kg
            fecha_p60 = base_date + timedelta(days=60)
            c60 = Control.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                checkup_date=fecha_p60.isoformat(),
                weight=405.0,
                health_status="Sano",
                description="Control de levante mes 2",
            )
            adg_mes2 = round((c60.weight - c30.weight) / (fecha_p60 - fecha_p30).days, 3)
            assert adg_mes2 == 0.800  # +800 g/día

            # Verificar que el peso del animal en base de datos esté sincronizado
            db.session.refresh(vaca)
            assert vaca.weight == 405.0

            # =================================================================
            # FASE 3: Transición Reproductiva (Parto y Entrada en Lactancia)
            # =================================================================
            vaca.is_lactating = True
            db.session.commit()
            db.session.refresh(vaca)
            assert vaca.is_lactating is True

            # =================================================================
            # FASE 4: Inicio de Producción Lechera Comercial Regular
            # =================================================================
            fecha_ordeno_regular = base_date + timedelta(days=70)
            p_am = MilkProduction.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                date=fecha_ordeno_regular,
                liters=15.5,
                milking_session=MilkSession.AM,
                fat_percentage=3.8,
                protein_percentage=3.2,
            )
            assert p_am.id is not None
            assert p_am.liters == 15.5

            p_pm = MilkProduction.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                date=fecha_ordeno_regular,
                liters=11.0,
                milking_session=MilkSession.PM,
                fat_percentage=3.9,
                protein_percentage=3.3,
            )
            assert p_pm.id is not None
            assert p_pm.liters == 11.0

            # =================================================================
            # FASE 5: Evento Clínico (Mastitis) y Tratamiento con Retiro
            # =================================================================
            fecha_tratamiento = base_date + timedelta(days=75)
            dias_retiro = 5
            fin_retiro = fecha_tratamiento + timedelta(days=dias_retiro)

            tratamiento = Treatments.create(
                animal_id=vaca.id,
                finca_id=finca_id,
                treatment_date=fecha_tratamiento,
                description="Tilosina + Espiramicina Intramamaria",
                dosis="10 ml",
                frequency="Cada 24 horas por 3 días",
                withdrawal_days=dias_retiro,
                withdrawal_end_date=fin_retiro,
                observations="Tratamiento de mastitis subclínica en ubre posterior izquierda",
            )
            assert tratamiento.id is not None
            assert tratamiento.withdrawal_end_date == fin_retiro

            # =================================================================
            # FASE 6: Control de Inocuidad — Intento de Ordeño Durante Retiro
            # =================================================================
            # Día 77 (2 días después del tratamiento, dentro del período de retiro)
            fecha_durante_retiro = fecha_tratamiento + timedelta(days=2)

            with pytest.raises(ValidationError) as exc_retiro:
                MilkProduction.create(
                    animal_id=vaca.id,
                    finca_id=finca_id,
                    date=fecha_durante_retiro,
                    liters=14.0,
                    milking_session=MilkSession.AM,
                )
            error_msg = str(exc_retiro.value).lower()
            assert "retiro" in error_msg
            assert "descartarse" in error_msg

            # Intento por API también bloqueado
            resp_api_bloqueo = client.post(
                "/api/v1/milk-production",
                json={
                    "animal_id": vaca.id,
                    "date": fecha_durante_retiro.isoformat(),
                    "liters": 14.0,
                    "milking_session": "AM",
                    "finca_id": finca_id,
                },
                headers=auth_headers,
            )
            assert resp_api_bloqueo.status_code in (400, 422)

            # =================================================================
            # FASE 7: Superación del Retiro y Retorno a Producción Comercial
            # =================================================================
            # Día 82 (posterior a fin_retiro)
            fecha_post_retiro = fin_retiro + timedelta(days=1)

            resp_post = client.post(
                "/api/v1/milk-production",
                json={
                    "animal_id": vaca.id,
                    "date": fecha_post_retiro.isoformat(),
                    "liters": 17.0,
                    "milking_session": "AM",
                    "finca_id": finca_id,
                },
                headers=auth_headers,
            )
            assert resp_post.status_code in (200, 201), resp_post.get_data(as_text=True)

            # =================================================================
            # FASE 8: Auditoría y Trazabilidad Histórica Inmutable
            # =================================================================
            # 1. Controles de peso
            controles = Control.query.filter_by(animal_id=vaca.id).order_by(Control.checkup_date.asc()).all()
            assert len(controles) == 3
            assert [c.weight for c in controles] == [360.0, 381.0, 405.0]

            # 2. Tratamientos registrados
            tratamientos = Treatments.query.filter_by(animal_id=vaca.id).all()
            assert len(tratamientos) == 1
            assert tratamientos[0].withdrawal_days == 5

            # 3. Bitácora sanitaria (AnimalHealthHistory)
            eventos_historia = AnimalHealthHistory.query.filter_by(animal_id=vaca.id).all()
            tipos_eventos = {e.event_type for e in eventos_historia}
            assert HealthEventType.Treatment in tipos_eventos
            assert HealthEventType.Milk in tipos_eventos
