"""Siembra un historial reproductivo realista para ejercitar el módulo.

Genera ciclos coherentes (celo → servicio → diagnóstico → parto) sobre las
hembras de una finca, incluyendo los casos que la finca sí ve en la práctica:
vacas repetidoras, servicios sin diagnóstico, abortos, partos gemelares y
mortalidad perinatal. Sirve para validar indicadores, no para producción.

Uso:
    python -m app.scripts.seed_reproduction_demo --finca 1 --months 30
"""

import argparse
import os
import random
import sys
from datetime import date, timedelta

sys.path.append(os.getcwd())

from app import create_app, db  # noqa: E402
from app.models.animals import Animals, AnimalStatus, Sex  # noqa: E402
from app.models.breeds import Breeds  # noqa: E402
from app.models.reproduction import (  # noqa: E402
    DiagnosisResult,
    EventType,
    InseminationTechnique,
    ReproductiveEvent,
)
from app.services.reproduction import apply_event_effects, load_rules  # noqa: E402

#: Prefijo de los animales creados por este script, para poder revertirlo.
DEMO_PREFIX = "DEMO-R"
#: Composición objetivo del hato de prueba.
TARGET_FEMALES = 24
TARGET_SIRES = 3
#: Probabilidades del modelo de simulación.
P_CONCEPTION = 0.52
P_NO_DIAGNOSIS = 0.15
P_ABORTION = 0.04
P_TWINS = 0.03
P_STILLBIRTH = 0.05
P_COMPLICATIONS = 0.08
TECHNIQUES = (
    (InseminationTechnique.Artificial, 0.6),
    (InseminationTechnique.Natural, 0.35),
    (InseminationTechnique.Transferencia_Embrionaria, 0.05),
)


def main() -> None:
    args = _parse_args()
    app = create_app("development")
    with app.app_context():
        rng = random.Random(args.seed)
        breed = Breeds.query.first()
        if breed is None:
            raise SystemExit("No hay razas registradas: siembre los catálogos primero.")

        sires = _ensure_animals(args.finca, breed, Sex.Macho, TARGET_SIRES, 1800, rng)
        females = _ensure_animals(
            args.finca, breed, Sex.Hembra, TARGET_FEMALES, 1400, rng
        )
        rules = load_rules(args.finca)
        created = 0
        for index, female in enumerate(females):
            created += _simulate_female(female, sires, rules, args.months, rng, index)
        db.session.commit()
        print(
            f"\n🐄 Historial reproductivo sembrado: {created} eventos sobre "
            f"{len(females)} hembras y {len(sires)} reproductores (finca {args.finca})."
        )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--finca", type=int, default=1, help="ID de la finca destino")
    parser.add_argument("--months", type=int, default=30, help="Meses de historial")
    parser.add_argument("--seed", type=int, default=2026, help="Semilla determinista")
    return parser.parse_args()


def _ensure_animals(
    finca_id: int,
    breed: Breeds,
    sex: Sex,
    target: int,
    base_age_days: int,
    rng: random.Random,
) -> list[Animals]:
    """Completa el hato hasta el tamaño objetivo con animales de prueba."""
    existing = Animals.query.filter_by(
        finca_id=finca_id, sex=sex, status=AnimalStatus.Vivo
    ).all()
    missing = max(0, target - len(existing))
    letter = "H" if sex == Sex.Hembra else "M"
    for index in range(missing):
        record = f"{DEMO_PREFIX}-{letter}{index + 1:03d}"
        if Animals.query.filter_by(record=record, finca_id=finca_id).first():
            continue
        animal = Animals(
            record=record,
            sex=sex,
            birth_date=date.today() - timedelta(days=base_age_days + rng.randint(0, 900)),
            weight=round(rng.uniform(380, 520), 1),
            status=AnimalStatus.Vivo,
            finca_id=finca_id,
            breeds_id=breed.id,
        )
        db.session.add(animal)
        existing.append(animal)
    db.session.flush()
    return existing


def _simulate_female(
    female: Animals,
    sires: list[Animals],
    rules,
    months: int,
    rng: random.Random,
    index: int,
) -> int:
    """Recorre el historial de una hembra desde el inicio del período."""
    today = date.today()
    start = today - timedelta(days=int(months * 30.4375))
    cursor = max(start, _first_service_date(female, rules))
    if cursor >= today:
        return 0

    # Una de cada seis hembras arrastra baja fertilidad: así aparecen
    # repetidoras y días abiertos largos, que es lo que la finca debe detectar.
    fertility = P_CONCEPTION * (0.45 if index % 6 == 0 else 1.0)
    created = 0
    guard = 0
    while cursor < today and guard < 40:
        guard += 1
        cursor, events = _run_cycle(female, sires, rules, cursor, today, fertility, rng)
        created += events
    return created


def _run_cycle(
    female: Animals,
    sires: list[Animals],
    rules,
    cursor: date,
    today: date,
    fertility: float,
    rng: random.Random,
) -> tuple[date, int]:
    """Simula un ciclo: celo, servicio y su desenlace. Devuelve el nuevo cursor."""
    created = 0
    heat_date = cursor + timedelta(days=rng.randint(0, rules.estrous_cycle_days))
    if heat_date >= today:
        return today, created
    if rng.random() < 0.7:
        created += _add(female, EventType.Celo, heat_date)

    service_date = heat_date
    sire = rng.choice(sires) if sires else None
    created += _add(
        female,
        EventType.Inseminacion,
        service_date,
        sire_id=sire.id if sire else None,
        technique=_pick_technique(rng),
    )

    if rng.random() >= fertility:
        return _fail_cycle(female, service_date, today, rules, rng, created)

    diagnosis_date = service_date + timedelta(days=rng.randint(35, 60))
    if diagnosis_date >= today:
        return today, created
    if rng.random() >= P_NO_DIAGNOSIS:
        created += _add(
            female,
            EventType.Diagnostico,
            diagnosis_date,
            diagnosis_result=DiagnosisResult.Positivo,
            expected_birth_date=service_date + timedelta(days=rules.gestation_days),
        )

    if rng.random() < P_ABORTION:
        return diagnosis_date + timedelta(days=rng.randint(20, 60)), created

    birth_date = service_date + timedelta(
        days=rules.gestation_days + rng.randint(-8, 8)
    )
    if birth_date >= today:
        return today, created
    created += _add(female, EventType.Parto, birth_date, **_birth_outcome(rng))
    return birth_date + timedelta(days=rules.voluntary_waiting_days), created


def _fail_cycle(
    female: Animals,
    service_date: date,
    today: date,
    rules,
    rng: random.Random,
    created: int,
) -> tuple[date, int]:
    """Servicio que no prosperó: diagnóstico negativo y retorno a celo."""
    diagnosis_date = service_date + timedelta(days=rng.randint(35, 55))
    if diagnosis_date < today and rng.random() >= P_NO_DIAGNOSIS:
        created += _add(
            female,
            EventType.Diagnostico,
            diagnosis_date,
            diagnosis_result=DiagnosisResult.Negativo,
        )
    return service_date + timedelta(days=rules.estrous_cycle_days), created


def _birth_outcome(rng: random.Random) -> dict:
    """Resultado del parto: número de crías, mortalidad y complicaciones."""
    calves = 2 if rng.random() < P_TWINS else 1
    dead = sum(1 for _ in range(calves) if rng.random() < P_STILLBIRTH)
    return {
        "alive_count": calves - dead,
        "dead_count": dead,
        "complications": rng.random() < P_COMPLICATIONS,
    }


def _first_service_date(female: Animals, rules) -> date:
    return female.birth_date + timedelta(
        days=int(rules.first_service_age_months * 30.4375)
    )


def _pick_technique(rng: random.Random) -> InseminationTechnique:
    roll = rng.random()
    cumulative = 0.0
    for technique, weight in TECHNIQUES:
        cumulative += weight
        if roll <= cumulative:
            return technique
    return InseminationTechnique.Artificial


def _add(female: Animals, event_type: EventType, when: date, **fields) -> int:
    """Registra un evento salvo que ya exista uno igual para ese día."""
    duplicate = ReproductiveEvent.query.filter_by(
        animal_id=female.id,
        finca_id=female.finca_id,
        event_type=event_type,
        event_date=when,
    ).first()
    if duplicate is not None:
        return 0
    event = ReproductiveEvent(
        animal_id=female.id,
        finca_id=female.finca_id,
        event_type=event_type,
        event_date=when,
        **fields,
    )
    db.session.add(event)
    db.session.flush()
    apply_event_effects(event)
    return 1


if __name__ == "__main__":
    main()
