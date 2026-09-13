"""Siembra casos clínicos con tratamientos vinculados en la finca principal.

El Módulo Sanidad fusiona ambos registros (caso clínico <-> tratamiento) en
una sola experiencia: un caso agrupa los tratamientos que lo originan. Para
que esa relación sea visible en pantalla, esta siembra:

1. Corre fechas de diagnóstico degeneradas (2001-01-01) a fechas plausibles.
2. Cierra dos casos que estaban sin fecha de alta (recovery_date).
3. Vincula tratamientos preventivos existentes al episodio que los motiva.
4. Crea dos casos nuevos (BOV-005 mastitis clínica y BOV-002 metritis
   postparto) a partir de tratamientos ya registrados, para que "Tratamientos"
   no quede huérfano.
5. Agrega tratamientos nuevos con costo, retiro y responsable, todos
   vinculados a un caso clínico, y avances de seguimiento (temperatura y
   observación) para los gráficos del seguimiento.

Idempotente: si el registro ya existe (misma finca, animal, descripción y
fecha) no lo duplica. Uso:

    python -m app.scripts.seed_sanidad_linked_demo --finca 1 --dry-run
    python -m app.scripts.seed_sanidad_linked_demo --finca 1
"""

import argparse
import logging
import os
import sys
from datetime import date

sys.path.append(os.getcwd())

from app import create_app, db  # noqa: E402
from app.models.animalDiseases import AnimalDiseases  # noqa: E402
from app.models.animalDiseaseProgress import AnimalDiseaseProgress  # noqa: E402
from app.models.animals import Animals  # noqa: E402
from app.models.diseases import Diseases  # noqa: E402
from app.models.treatments import Treatments  # noqa: E402
from app.models.user import User  # noqa: E402

logger = logging.getLogger(__name__)

#: Fecha de diagnóstico "degenerada" que indica datos de prueba mal sembrados.
BOGUS_DATE = date(2001, 1, 1)

#: Roles que pueden registrar/dirigir un caso clínico o un tratamiento.
INSTRUCTOR_NAME = "Instructor Jefe"
VET_NAME = "Dr. Martínez Vet"

#: Res (registro único dentro de la finca) y enfermedad por nombre canónico.
CASES = {
    # BOV-001 · Mastitis: caso existente, se le agrega tratamiento y avances.
    "1410": {
        "call": "link_and_extend",
        "record": "BOV-001",
        "disease": "Mastitis",
        "status": "En tratamiento",
        "severity": "Moderada",
        "handler": [
            {
                "description": "Oxitetraciclina 200 mg intramamario",
                "dosis": "10 ml por cuarto infectado",
                "frequency": "Cada 12 h por 5 días",
                "date": date(2026, 9, 8),
                "withdrawal_days": 5,
                "cost": 48000,
                "observations": "Mastitis grado 3 en cuarto trasero: leche con grumos y ubre caliente",
            },
            {
                "description": "Penicilina-estreptomicina sintética IM",
                "dosis": "8 ml IM",
                "frequency": "Cada 24 h por 3 días",
                "date": date(2026, 9, 8),
                "withdrawal_days": 7,
                "cost": 35500,
                "observations": "Refuerzo sistémico de la infección",
            },
        ],
        "progress": [
            {
                "date": date(2026, 9, 8),
                "temperature": 39.7,
                "status": "En tratamiento",
                "observation": "Inicio del esquema intramamario: ubre menos caliente, sin grumos en dos cuartos",
            },
        ],
    },
    # BOV-003 · Neumonía (2025): cerrar caso con fecha de alta y vincular sus
    # tratamientos ya registrados (Florfenicol, desparasitación).
    "1411": {
        "call": "close_and_link",
        "record": "BOV-003",
        "disease": "Neumonia",
        "status": "Recuperado",
        "severity": "Moderada",
        "recovery_date": date(2025, 11, 6),
        "link_descriptions": [
            "Florfenicol 300mg para neumonia bacteriana",
            "Desparasitación Albendazol + Levamisol",
        ],
    },
    # BOV-003 · Aftosa (2026): caso activo, agregar tratamiento.
    "1417": {
        "call": "link_and_extend",
        "record": "BOV-003",
        "disease": "Aftosa",
        "status": "Activo",
        "severity": "Moderada",
        "handler": [
            {
                "description": "Antipirético y antiinflamatorio (flunixin)",
                "dosis": "5 ml IM",
                "frequency": "Dosis única",
                "withdrawal_days": 2,
                "cost": 27500,
                "observations": "Fiebre mantenida después del manejo inicial",
            },
        ],
    },
    # BOV-006 · Aftosa: gravedad leve + apoyo inmunológico.
    "1420": {
        "call": "link_and_extend",
        "record": "BOV-006",
        "disease": "Aftosa",
        "status": "Activo",
        "severity": "Leve",
        "handler": [
            {
                "description": "Refuerzo vitamínico complejo B",
                "dosis": "5 ml IM",
                "frequency": "Dosis única",
                "withdrawal_days": 0,
                "cost": 8000,
                "observations": "Apoyo inmunológico tras cuadro febril",
            },
        ],
    },
    # BOV-008 · Aftosa (vendido): cerrar el caso con fecha de alta.
    "1422": {
        "call": "close_and_link",
        "record": "BOV-008",
        "disease": "Aftosa",
        "status": "Recuperado",
        "severity": "Moderada",
        "recovery_date": date(2026, 8, 8),
        "link_descriptions": [],
    },
    # BOV-009 · Aftosa: agregar antibioticoterapia.
    "1423": {
        "call": "link_and_extend",
        "record": "BOV-009",
        "disease": "Aftosa",
        "status": "Activo",
        "severity": "Moderada",
        "handler": [
            {
                "description": "Sulfadoxina-trimetoprim bovino",
                "dosis": "15 ml IM",
                "frequency": "Dosis única",
                "withdrawal_days": 4,
                "cost": 44000,
                "observations": "Vesículas en lengua y encías, fiebre 39.9 °C",
            },
        ],
    },
    # BOV-015 · Aftosa: caso grave con esquema doble.
    "1439": {
        "call": "link_and_extend",
        "record": "BOV-015",
        "disease": "Aftosa",
        "status": "En tratamiento",
        "severity": "Severa",
        "handler": [
            {
                "description": "Analgésico-antipirético (metamizol 30 %)",
                "dosis": "10 ml IV",
                "frequency": "Cada 12 h por 2 días",
                "withdrawal_days": 0,
                "cost": 18000,
                "observations": "Fiebre 40.1 °C al diagnóstico, decaimiento marcado",
            },
            {
                "description": "Antibiótico de amplio espectro (sulfadoxina-trimetoprim)",
                "dosis": "20 ml IM",
                "frequency": "Dosis única",
                "withdrawal_days": 5,
                "cost": 52000,
                "observations": "Cobertura antibiótica por vesículas en lengua",
            },
        ],
    },
    # CO-01-0020 · Aftosa: antipirético.
    "1444": {
        "call": "link_and_extend",
        "record": "CO-01-0020",
        "disease": "Aftosa",
        "status": "Activo",
        "severity": "Leve",
        "handler": [
            {
                "description": "Metamizol antipirético",
                "dosis": "12 ml IV",
                "frequency": "Cada 8 h por 2 días",
                "withdrawal_days": 0,
                "cost": 16000,
                "observations": "Control término el primer día de la lesión",
            },
        ],
    },
    # DEMO-R-H014 · Timpanismo (2026-09-08): manejo agudo + asesamiento.
    "1450": {
        "call": "link_and_extend",
        "record": "DEMO-R-H014",
        "disease": "Timpanismo Ruminal (Empaste)",
        "status": "Activo",
        "severity": "Leve",
        "handler": [
            {
                "description": "Dimeticona antiespumante oral",
                "dosis": "30 ml oral",
                "frequency": "Dosis única",
                "withdrawal_days": 0,
                "cost": 12500,
                "observations": "Empaste leve: rumia normal a las 2 h del manejo",
            },
        ],
        "progress": [
            {
                "date": date(2026, 9, 8),
                "temperature": 39.4,
                "status": "Activo",
                "observation": "Empaste leve: manejo con antiflatulento y caminata; se retoma la rumia",
            },
        ],
    },
    # Nota: los episodios 1453/1454/1455 (SMK-0, DEMO-R-H014) quedaron
    # eliminados en pruebas (is_deleted) y sus registros vinculados son de
    # humo ([crud-smoke]); la siembra los omite a propósito.
}

#: Casos nuevos creados a partir de tratamientos ya existentes.
NEW_EPISODES = [
    {
        "record": "BOV-005",
        "disease": "Mastitis Clínica",
        "diagnosis_date": date(2026, 3, 14),
        "status": "En tratamiento",
        "severity": "Moderada",
        "notes": "Mastitis clínica grado 2 detectada en ordeño; tratamientos ya registrados en el módulo",
        # Tratamientos ya registrados que se vinculan a este caso.
        "link_descriptions": [
            "Oxitetraciclina 200mg intramamario para mastitis",
            "Desparasitación Ivermectina para mastitis concurrente",
        ],
        # Nuevo tratamiento del esquema.
        "handler": [
            {
                "description": "Antiinflamatorio flunixin meglumina",
                "dosis": "10 ml IM",
                "frequency": "Cada 24 h por 2 días",
                "withdrawal_days": 2,
                "cost": 28500,
                "observations": "Inflamación de la ubre en decremento",
            },
        ],
        "progress": [
            {
                "date": date(2026, 3, 15),
                "temperature": 39.2,
                "status": "En tratamiento",
                "observation": "Evolución favorable: edema en retirada, leche sin grumos en un cuarto",
            },
        ],
    },
    {
        "record": "BOV-002",
        "disease": "Metritis y Endometritis Postparto",
        "diagnosis_date": date(2026, 4, 14),
        "status": "En tratamiento",
        "severity": "Leve",
        "notes": "Metritis postparto detectada en revisión rutinaria; tratamientos ya registrados",
        "link_descriptions": [
            "Oxitetraciclina 200mg preventiva post-parto",
            "Calcio EV + Vitaminas complejo B peri-parto",
        ],
        "handler": [
            {
                "description": "Enrofloxacina 10 %",
                "dosis": "12 ml SC",
                "frequency": "Cada 24 h por 4 días",
                "withdrawal_days": 6,
                "cost": 62000,
                "observations": "Metritis postparto: descarga fétida y apetito bajo",
            },
        ],
        "progress": [
            {
                "date": date(2026, 4, 15),
                "temperature": 39.5,
                "status": "En tratamiento",
                "observation": "Inicio de antibiótico de apoyo: temperatura estable, descarga en retirada",
            },
        ],
    },
]

#: Tratamientos y fecha límite para la búsqueda idempotente.
DEMO_TREATMENT_MARKER = "Aplicación demostrativa del módulo de sanidad"


def _parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--finca", type=int, default=1, help="ID de la finca destino")
    parser.add_argument("--dry-run", action="store_true", help="Solo informar qué haría")
    return parser.parse_args()


def _get_or_none(record, finca_id):
    return Animals.query.filter_by(record=record, finca_id=finca_id).first()


def _get_progress(episode_id, progress_date, observation):
    return AnimalDiseaseProgress.query.filter_by(
        animal_disease_id=episode_id, progress_date=progress_date, observation=observation
    ).first()


def _create_treatment(finca_id, animal, episode, payload, performer, dry_run, created_counts):
    treatment_date = payload.get("date") or episode.diagnosis_date
    existing = Treatments.query.filter_by(
        finca_id=finca_id,
        animal_id=animal.id,
        animal_disease_id=episode.id,
        description=payload["description"],
        treatment_date=treatment_date,
    ).first()
    if existing:
        return None
    if dry_run:
        created_counts["treatments"] += 1
        return None
    instance = Treatments.create(
        finca_id=finca_id,
        animal_id=animal.id,
        animal_disease_id=episode.id,
        treatment_date=treatment_date,
        description=payload["description"],
        dosis=payload["dosis"],
        frequency=payload["frequency"],
        withdrawal_days=payload["withdrawal_days"],
        cost=payload["cost"],
        observations=payload["observations"] + " · " + DEMO_TREATMENT_MARKER,
        performed_by=performer.id,
    )
    created_counts["treatments"] += 1
    return instance


def _create_progress(finca_id, episode, payload, performer, dry_run, created_counts):
    if _get_progress(episode.id, payload["date"], payload["observation"]):
        return None
    if dry_run:
        created_counts["progress"] += 1
        return None
    instance = AnimalDiseaseProgress.create(
        finca_id=finca_id,
        animal_disease_id=episode.id,
        progress_date=payload["date"],
        temperature=payload.get("temperature"),
        status=payload.get("status"),
        observation=payload["observation"] + " · " + DEMO_TREATMENT_MARKER,
        performed_by=performer.id,
    )
    created_counts["progress"] += 1
    return instance


def _link_existing(finca_id, episode, descriptions, dry_run, created_counts):
    for description in descriptions:
        treatment = (
            Treatments.query.filter_by(
                animal_id=episode.animal_id,
                finca_id=finca_id,
                description=description,
            )
            .filter(Treatments.animal_disease_id.is_(None))
            .first()
        )
        if not treatment:
            continue
        if dry_run:
            created_counts["links"] += 1
            continue
        treatment.update(animal_disease_id=episode.id)
        created_counts["links"] += 1


def main():
    args = _parse_args()
    logging.basicConfig(level=logging.INFO)
    app = create_app("development")
    with app.app_context():
        finca_id = args.finca
        instructor = User.query.filter_by(finca_id=finca_id, role="Instructor").first()
        if not instructor:
            raise SystemExit(
                f"No hay instructor en la finca {finca_id}: aborte la siembra."
            )
        vet = (
            User.query.filter_by(finca_id=finca_id, role="Veterinario").first()
            or instructor
        )
        created_counts = {"episodes": 0, "treatments": 0, "progress": 0, "links": 0, "updates": 0}
        dry = " (dry-run)" if args.dry_run else ""

        # 1) Corregir fechas degeneradas y sembrar casos existentes.
        for episode_id_str, spec in CASES.items():
            episode = AnimalDiseases.get_by_id(int(episode_id_str))
            if not episode or episode.finca_id != finca_id:
                logger.info("Episodio %s no existe en la finca %s: se omite", episode_id_str, finca_id)
                continue
            animal = episode.animal
            if spec.get("call") == "fix_date_and_extend":
                if episode.diagnosis_date == BOGUS_DATE and not args.dry_run:
                    episode.update(diagnosis_date=spec["new_date"])
                    created_counts["updates"] += 1
            elif spec.get("call") in {"link_and_extend", "close_and_link", "touch_severity"}:
                changed = False
                if episode.status != spec["status"] and not args.dry_run:
                    episode.status = spec["status"]
                    changed = True
                if spec.get("severity") and episode.severity != spec["severity"] and not args.dry_run:
                    episode.severity = spec["severity"]
                    changed = True
                if spec.get("recovery_date") and not episode.recovery_date and not args.dry_run:
                    episode.recovery_date = spec["recovery_date"]
                    changed = True
                if changed:
                    created_counts["updates"] += 1
            _link_existing(
                finca_id,
                episode,
                spec.get("link_descriptions", []),
                args.dry_run,
                created_counts,
            )
            for payload in spec.get("handler", []):
                _create_treatment(
                    finca_id, animal, episode, payload, vet, args.dry_run, created_counts
                )
            for payload in spec.get("progress", []):
                _create_progress(
                    finca_id, episode, payload, vet, args.dry_run, created_counts
                )

        # 2) Crear casos nuevos a partir de tratamientos ya registrados.
        for spec in NEW_EPISODES:
            animal = _get_or_none(spec["record"], finca_id)
            if not animal:
                logger.info("Animal %s no existe en la finca %s: se omite", spec["record"], finca_id)
                continue
            disease = (
                Diseases.query.filter_by(finca_id=finca_id, name=spec["disease"]).first()
                or Diseases.query.filter_by(name=spec["disease"]).first()
            )
            if not disease:
                logger.info("Enfermedad %s no existe: se omite", spec["disease"])
                continue
            episode = AnimalDiseases.query.filter_by(
                animal_id=animal.id,
                disease_id=disease.id,
                diagnosis_date=spec["diagnosis_date"],
            ).first()
            if not episode:
                if args.dry_run:
                    created_counts["episodes"] += 1
                    created_counts["links"] += len(spec.get("link_descriptions", []))
                    created_counts["treatments"] += len(spec.get("handler", []))
                    created_counts["progress"] += len(spec.get("progress", []))
                    continue
                episode = AnimalDiseases.create(
                    finca_id=finca_id,
                    animal_id=animal.id,
                    disease_id=disease.id,
                    instructor_id=instructor.id,
                    diagnosis_date=spec["diagnosis_date"],
                    status=spec["status"],
                    severity=spec["severity"],
                    notes=spec.get("notes"),
                )
                created_counts["episodes"] += 1
            _link_existing(
                finca_id, episode, spec.get("link_descriptions", []), args.dry_run, created_counts
            )
            for payload in spec.get("handler", []):
                _create_treatment(
                    finca_id, animal, episode, payload, vet, args.dry_run, created_counts
                )
            for payload in spec.get("progress", []):
                _create_progress(
                    finca_id, episode, payload, vet, args.dry_run, created_counts
                )

        if not args.dry_run and db.session.is_active:
            db.session.commit()
        print(
            f"Datos de sanidad enlazada listos para finca {finca_id}{dry}: "
            f"{created_counts['updates']} actualizaciones, {created_counts['episodes']} casos "
            f"nuevos, {created_counts['treatments']} tratamientos nuevos, "
            f"{created_counts['links']} tratamientos vinculados, "
            f"{created_counts['progress']} avances."
        )


if __name__ == "__main__":
    main()
