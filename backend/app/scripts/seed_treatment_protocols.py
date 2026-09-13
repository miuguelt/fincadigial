"""Siembra el catálogo maestro de protocolos de tratamiento en una finca.

Crea protocolos reutilizables (base de conocimiento) con sus insumos
recomendados para que la finca empiece sin partir de cero. Los protocolos son
por finca (tenant); si el medicamento/vacuna indicado no existe en el catálogo
de la finca, el protocolo se crea igual sin insumos y se informa por consola.

Idempotente: no duplica si ya existe un protocolo con el mismo nombre en la
finca. Uso:

    python -m app.scripts.seed_treatment_protocols --finca 1 --dry-run
    python -m app.scripts.seed_treatment_protocols --finca 1
"""

import argparse
import logging
import os
import sys

sys.path.append(os.getcwd())

from app import create_app, db  # noqa: E402
from app.models.diseases import Diseases  # noqa: E402
from app.models.medications import Medications  # noqa: E402
from app.models.treatment_protocols import TreatmentProtocol  # noqa: E402
from app.models.treatment_protocol_insumos import (  # noqa: E402
    TreatmentProtocolInsumo,
)
from app.models.vaccines import Vaccines  # noqa: E402

logger = logging.getLogger(__name__)


#: Catálogo maestro de protocolos (conocimiento base, es-CO).
PROTOCOLS = [
    {
        "name": "Mastitis aguda - terapia intramamaria",
        "description": (
            "Oxitetraciclina intramamaria en el cuarto afectado + ordeño "
            "frecuente. Aplicar con técnica limpia y verificar retiro de leche."
        ),
        "disease": "Mastitis",
        "severity": "Moderada",
        "dosis": "10 ml por cuarto afectado",
        "frequency": "Cada 12 h por 5 días",
        "withdrawal_days": 5,
        "duration_days": 5,
        "insumos": [
            {"kind": "medicamento", "name": "Oxitetraciclina", "quantity": 4},
        ],
    },
    {
        "name": "Mastitis severa - refuerzo sistémico",
        "description": (
            "Antibiótico sistémico IM cuando la mastitis no cede con la "
            "terapia local o hay fiebre. Completar el esquema completo."
        ),
        "disease": "Mastitis",
        "severity": "Severa",
        "dosis": "8 ml IM",
        "frequency": "Cada 24 h por 3 días",
        "withdrawal_days": 7,
        "duration_days": 3,
        "insumos": [
            {"kind": "medicamento", "name": "Penicilina", "quantity": 3},
        ],
    },
    {
        "name": "Neumonía bovina - florfenicol",
        "description": (
            "Antibiótico de amplio espectro para afecciones respiratorias. "
            "Aplicar IM en dosis única repetible a las 48 h. Vigilar retiro."
        ),
        "disease": "Neumonía",
        "severity": "Severa",
        "dosis": "20 mg/kg IM",
        "frequency": "Cada 48 h, 2 dosis",
        "withdrawal_days": 30,
        "duration_days": 4,
        "insumos": [
            {"kind": "medicamento", "name": "Florfenicol", "quantity": 2},
        ],
    },
    {
        "name": "Cuadro febril - antiinflamatorio",
        "description": (
            "Antiinflamatorio no esteroideo para fiebre o dolor. Complementa "
            "la causa de fondo; no sustituye el diagnóstico."
        ),
        "disease": None,
        "severity": "Moderada",
        "dosis": "Según presentación, por vía IM o IV",
        "frequency": "Dosis única, repetible a las 24 h si persiste",
        "withdrawal_days": 8,
        "duration_days": 2,
        "insumos": [
            {"kind": "medicamento", "name": "Ketoprofeno", "quantity": 2},
            {"kind": "medicamento", "name": "Flunixin", "quantity": 2},
        ],
    },
    {
        "name": "Diarrea neonatal - hidratación y antibiótico",
        "description": (
            "Hidratación oral o parenteral + antibiótico según gravedad. "
            "Aislar el ternero y vigilar signos de deshidratación."
        ),
        "disease": "Diarrea",
        "severity": "Moderada",
        "dosis": "Hidratación según peso y estado",
        "frequency": "Cada 8 h, reevaluando al ternero",
        "withdrawal_days": 5,
        "duration_days": 3,
        "insumos": [],
    },
    {
        "name": "Desparasitación general - ivermectina",
        "description": (
            "Control parasitario periódico. Respetar el tiempo de retiro "
            "según la presentación usada antes de vender leche o carne."
        ),
        "disease": None,
        "severity": "Leve",
        "dosis": "1 ml por cada 50 kg SC",
        "frequency": "Dosis única; repetir según carga parasitaria",
        "withdrawal_days": 49,
        "duration_days": 1,
        "insumos": [
            {"kind": "medicamento", "name": "Ivermectina", "quantity": 1},
        ],
    },
    {
        "name": "Heridas y cortes - curación",
        "description": (
            "Limpieza con solución antiséptica, curación y antibiótico tópico "
            "si hay infección. Revisar la herida a diario hasta cicatrizar."
        ),
        "disease": None,
        "severity": "Leve",
        "dosis": "Tópico según el tamaño de la herida",
        "frequency": "Aplicación diaria hasta cicatrizar",
        "withdrawal_days": 3,
        "duration_days": 7,
        "insumos": [
            {"kind": "medicamento", "name": "Penicilina", "quantity": 1},
        ],
    },
]


def _resolve_insumo(finca_id, item):
    """Busca el medicamento/vacuna por nombre dentro de la finca."""
    token = item.get("name", "").strip()
    if not token:
        return None, None
    if item.get("kind") == "vacuna":
        match = (
            Vaccines.query.filter(
                Vaccines.finca_id == finca_id,
                Vaccines.is_deleted.is_(False),
                Vaccines.name.ilike(f"%{token}%"),
            ).first()
        )
        return ("vaccine_id", match.id) if match else (None, None)
    match = (
        Medications.query.filter(
            Medications.finca_id == finca_id,
            Medications.is_deleted.is_(False),
            Medications.name.ilike(f"%{token}%"),
        ).first()
    )
    return ("medication_id", match.id) if match else (None, None)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--finca", type=int, required=True, help="ID de la finca")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra lo que haría")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        finca_id = args.finca
        created_protocols = 0
        created_insumos = 0
        for spec in PROTOCOLS:
            existing = TreatmentProtocol.query.filter_by(
                name=spec["name"], finca_id=finca_id
            ).first()
            if existing:
                logger.info("Ya existe: %s", spec["name"])
                continue

            disease = None
            if spec.get("disease"):
                disease = Diseases.query.filter(
                    Diseases.finca_id == finca_id,
                    Diseases.name == spec["disease"],
                ).first()

            if args.dry_run:
                logger.info("[dry-run] Crearía protocolo: %s", spec["name"])
                continue

            protocol = TreatmentProtocol.create(
                name=spec["name"],
                description=spec["description"],
                disease_id=disease.id if disease else None,
                severity=spec.get("severity"),
                default_dosis=spec.get("dosis", ""),
                default_frequency=spec.get("frequency", ""),
                withdrawal_days=spec.get("withdrawal_days", 0),
                duration_days=spec.get("duration_days"),
                is_default=True,
                finca_id=finca_id,
            )
            created_protocols += 1

            for item in spec.get("insumos") or []:
                field, ref_id = _resolve_insumo(finca_id, item)
                if not field:
                    logger.warning(
                        "Protocolo '%s': no se encontró el insumo '%s' en la finca",
                        spec["name"],
                        item.get("name"),
                    )
                    continue
                kwargs = {
                    "protocol_id": protocol.id,
                    "finca_id": finca_id,
                    "kind": item["kind"],
                    field: ref_id,
                }
                if item.get("dosis"):
                    kwargs["recommended_dosis"] = item["dosis"]
                if item.get("quantity") is not None:
                    kwargs["recommended_quantity"] = item["quantity"]
                TreatmentProtocolInsumo.create(**kwargs)
                created_insumos += 1
                logger.info(
                    "Protocolo '%s': insumo %s #%s ligado",
                    spec["name"],
                    item["kind"],
                    ref_id,
                )

        db.session.commit()
        logger.info(
            "Siembra terminada: %d protocolo(s) creado(s), %d insumo(s) ligado(s).",
            created_protocols,
            created_insumos,
        )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    main()
