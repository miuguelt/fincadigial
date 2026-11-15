"""Compuerta sanitaria y regulatoria ICA previa a la movilización de ganado.

Asegura que ningún animal sea comercializado ni trasladado violando los
períodos de retiro de medicamentos o las normas sanitarias oficiales
(Fiebre Aftosa / ICA Resolución 20148).
"""

from datetime import date
from typing import NamedTuple, Optional
import logging

from app.models.treatments import Treatments
from app.models.animal_movements import MovementType
from app.models.animals import Animals
from app.services.analytics.medical.ica_compliance import check_animal_ica

logger = logging.getLogger(__name__)


class SanitaryCheckResult(NamedTuple):
    allowed: bool
    conflict_type: Optional[str]  # "WITHDRAWAL_ACTIVE" | "AFTOSA_OVERDUE" | "AFTOSA_MISSING" | None
    message: str
    metadata: dict


class SanitaryMovementGate:
    """Compuerta sanitaria y regulatoria ICA previa a la movilización de ganado."""

    @classmethod
    def check_movement_eligibility(
        cls,
        animal: Animals,
        fecha_movimiento: date,
        tipo_movimiento: MovementType,
        traslado_sanitario_emergencia: bool = False,
        justificacion_sanitaria: Optional[str] = None,
        finca_id: Optional[int] = None,
    ) -> SanitaryCheckResult:
        """Evalúa si un animal está en condiciones sanitarias y regulatorias para movilizarse.

        Reglas:
        1. Período de retiro activo:
           - Ventas (externas o en predio): Bloqueo estricto e incondicional.
           - Traslado interno: Bloqueado a menos que se declare traslado sanitario de
             emergencia con justificación médica (>= 10 caracteres).
        2. Fiebre Aftosa vencida (overdue):
           - Ventas: Bloqueo estricto.
           - Traslado interno: Bloqueado salvo emergencia médica justificada.
        3. Fiebre Aftosa faltante (missing):
           - Animales mayores a 180 días (6 meses): Bloqueo para venta y traslado no justificado.
           - Terneros menores a 180 días: Permitido como cría al pie de la madre.
        """
        effective_finca_id = finca_id or animal.finca_id
        is_venta = tipo_movimiento in (
            MovementType.Venta_Traslado_Externo,
            MovementType.Venta_En_Predio,
        )

        # =========================================================================
        # 1. Verificación de Período de Retiro Activo
        # =========================================================================
        active_treatment = (
            Treatments.query.filter(
                Treatments.animal_id == animal.id,
                Treatments.withdrawal_end_date.isnot(None),
                Treatments.withdrawal_end_date >= fecha_movimiento,
            )
            .order_by(Treatments.withdrawal_end_date.desc())
            .first()
        )

        if active_treatment:
            dias_restantes = (active_treatment.withdrawal_end_date - fecha_movimiento).days
            med_desc = active_treatment.description or "tratamiento veterinario"

            if is_venta:
                return SanitaryCheckResult(
                    allowed=False,
                    conflict_type="WITHDRAWAL_ACTIVE",
                    message=(
                        f"El animal {animal.record} tiene un período de retiro activo vigente hasta "
                        f"{active_treatment.withdrawal_end_date} por {med_desc}. Por normativa del ICA "
                        f"y seguridad alimentaria, no puede ser vendido ni faenado hasta cumplir el retiro."
                    ),
                    metadata={
                        "conflict_type": "WITHDRAWAL_ACTIVE",
                        "withdrawal_end_date": active_treatment.withdrawal_end_date.isoformat(),
                        "treatment_id": active_treatment.id,
                        "dias_restantes": max(0, dias_restantes),
                    },
                )

            # Traslado Interno
            if not traslado_sanitario_emergencia:
                return SanitaryCheckResult(
                    allowed=False,
                    conflict_type="WITHDRAWAL_ACTIVE",
                    message=(
                        f"El animal {animal.record} tiene período de retiro activo hasta "
                        f"{active_treatment.withdrawal_end_date}. Para traslados internos de aislamiento "
                        f"o urgencia médica, active 'traslado_sanitario_emergencia' e ingrese la justificación clínica."
                    ),
                    metadata={
                        "conflict_type": "WITHDRAWAL_ACTIVE",
                        "withdrawal_end_date": active_treatment.withdrawal_end_date.isoformat(),
                        "treatment_id": active_treatment.id,
                        "dias_restantes": max(0, dias_restantes),
                    },
                )

            # Emergencia declarada: verificar justificación
            just_clean = (justificacion_sanitaria or "").strip()
            if len(just_clean) < 10:
                return SanitaryCheckResult(
                    allowed=False,
                    conflict_type="WITHDRAWAL_ACTIVE",
                    message="Para traslados internos de animales con retiro activo se requiere una justificación sanitaria de al menos 10 caracteres.",
                    metadata={
                        "conflict_type": "WITHDRAWAL_ACTIVE",
                        "withdrawal_end_date": active_treatment.withdrawal_end_date.isoformat(),
                        "treatment_id": active_treatment.id,
                        "dias_restantes": max(0, dias_restantes),
                    },
                )

        # =========================================================================
        # 2. Verificación de Cumplimiento Oficial de Fiebre Aftosa
        # =========================================================================
        ica_data = check_animal_ica(
            animal.id, today=fecha_movimiento, finca_id=effective_finca_id
        )
        aftosa_check = ica_data.get("checks", {}).get("aftosa", {})
        aftosa_status = aftosa_check.get("status")
        aftosa_days = aftosa_check.get("days")

        if aftosa_status == "overdue":
            if is_venta:
                return SanitaryCheckResult(
                    allowed=False,
                    conflict_type="AFTOSA_OVERDUE",
                    message=(
                        f"El animal {animal.record} tiene la vacunación contra Fiebre Aftosa vencida "
                        f"({aftosa_days} días desde la última aplicación; vigencia máxima 180 días). "
                        f"El ICA prohíbe expedir GSMI o comercializar ganado sin esquema de vacunación vigente."
                    ),
                    metadata={
                        "conflict_type": "AFTOSA_OVERDUE",
                        "aftosa_status": "overdue",
                        "dias_desde_aplicacion": aftosa_days,
                        "max_days": 180,
                    },
                )

            # Traslado Interno con Aftosa vencida
            if not traslado_sanitario_emergencia:
                return SanitaryCheckResult(
                    allowed=False,
                    conflict_type="AFTOSA_OVERDUE",
                    message=(
                        f"El animal {animal.record} tiene la vacuna contra Aftosa vencida ({aftosa_days} días). "
                        f"Para traslados internos de manejo o emergencia sanitaria, active 'traslado_sanitario_emergencia' "
                        f"con su correspondiente justificación."
                    ),
                    metadata={
                        "conflict_type": "AFTOSA_OVERDUE",
                        "aftosa_status": "overdue",
                        "dias_desde_aplicacion": aftosa_days,
                        "max_days": 180,
                    },
                )

            just_clean = (justificacion_sanitaria or "").strip()
            if len(just_clean) < 10:
                return SanitaryCheckResult(
                    allowed=False,
                    conflict_type="AFTOSA_OVERDUE",
                    message="Para traslados internos de animales con aftosa vencida se requiere una justificación sanitaria de al menos 10 caracteres.",
                    metadata={
                        "conflict_type": "AFTOSA_OVERDUE",
                        "aftosa_status": "overdue",
                        "dias_desde_aplicacion": aftosa_days,
                        "max_days": 180,
                    },
                )

        elif aftosa_status == "missing":
            # Si el animal es mayor de 180 días (6 meses), la falta de vacuna bloquea venta
            edad_dias = (
                (fecha_movimiento - animal.birth_date).days
                if animal.birth_date
                else 999
            )
            if edad_dias > 180:
                if is_venta:
                    return SanitaryCheckResult(
                        allowed=False,
                        conflict_type="AFTOSA_MISSING",
                        message=(
                            f"El animal {animal.record} tiene {edad_dias} días de edad y carece de registro "
                            f"de vacunación contra Fiebre Aftosa. No puede movilizarse comercialmente sin esquema oficial."
                        ),
                        metadata={
                            "conflict_type": "AFTOSA_MISSING",
                            "aftosa_status": "missing",
                            "edad_dias": edad_dias,
                        },
                    )

                if not traslado_sanitario_emergencia:
                    return SanitaryCheckResult(
                        allowed=False,
                        conflict_type="AFTOSA_MISSING",
                        message=(
                            f"El animal {animal.record} no cuenta con registro de vacuna contra Aftosa. "
                            f"Para traslados internos de manejo, active 'traslado_sanitario_emergencia' con justificación."
                        ),
                        metadata={
                            "conflict_type": "AFTOSA_MISSING",
                            "aftosa_status": "missing",
                            "edad_dias": edad_dias,
                        },
                    )

                just_clean = (justificacion_sanitaria or "").strip()
                if len(just_clean) < 10:
                    return SanitaryCheckResult(
                        allowed=False,
                        conflict_type="AFTOSA_MISSING",
                        message="Para traslados internos de animales sin vacuna de aftosa se requiere una justificación sanitaria de al menos 10 caracteres.",
                        metadata={
                            "conflict_type": "AFTOSA_MISSING",
                            "aftosa_status": "missing",
                            "edad_dias": edad_dias,
                        },
                    )

        return SanitaryCheckResult(
            allowed=True,
            conflict_type=None,
            message="Animal apto para movilización según compuerta sanitaria ICA",
            metadata={},
        )
