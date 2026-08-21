"""Definición del namespace reproductivo y sus modelos de entrada.

Vive aparte de las rutas para que los módulos de rutas puedan importarlo sin
ciclos y para que el contrato Swagger tenga un único lugar de verdad.
"""

import flask
from flask_restx import Namespace, fields

reproduction_ns = Namespace(
    "reproduction",
    description="🐄 Gestión reproductiva: celos, inseminaciones, diagnósticos y partos",
)

# --- Swagger models ---

event_input_model = reproduction_ns.model(
    "ReproductiveEventInput",
    {
        "animal_id": fields.Integer(required=True, description="ID de la hembra"),
        "event_type": fields.String(
            required=True, enum=["Celo", "Inseminacion", "Diagnostico", "Parto"]
        ),
        "event_date": fields.Date(required=True),
        "sire_id": fields.Integer(description="ID del macho (solo Inseminacion)"),
        "technique": fields.String(
            enum=["Natural", "Artificial", "Transferencia_Embrionaria"]
        ),
        "diagnosis_result": fields.String(enum=["Positivo", "Negativo", "Pendiente"]),
        "expected_birth_date": fields.Date(
            description="Se calcula automáticamente si no se provee"
        ),
        "alive_count": fields.Integer(description="Crías vivas (solo Parto)"),
        "dead_count": fields.Integer(description="Crías muertas (solo Parto)"),
        "complications": fields.Boolean(
            description="¿Hubo complicaciones? (solo Parto)"
        ),
        "notes": fields.String(),
    },
)

offspring_input_model = reproduction_ns.model(
    "OffspringInput",
    {
        "birth_event_id": fields.Integer(required=True),
        "animal_id": fields.Integer(
            description="ID del animal creado para esta cría (opcional)"
        ),
        "sex": fields.String(enum=["Hembra", "Macho"]),
        "alive": fields.Boolean(default=True),
        "birth_weight": fields.Integer(),
        "notes": fields.String(),
    },
)


def _parse_int(name, default=1):
    val = flask.request.args.get(name, default=default, type=int)
    return max(1, val or default)


# --- Reproductive Events ---

