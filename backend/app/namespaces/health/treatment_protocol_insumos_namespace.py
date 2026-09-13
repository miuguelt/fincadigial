"""Namespace de insumos recomendados por protocolo de tratamiento.

CRUD genérico por finca sobre ``TreatmentProtocolInsumo`` (un medicamento o
una vacuna recomendados con dosis/cantidad sugeridas).
"""

from app.models.treatment_protocol_insumos import TreatmentProtocolInsumo
from app.utils.namespace_helpers import create_optimized_namespace

treatment_protocol_insumos_ns = create_optimized_namespace(
    "treatment-protocol-insumos",
    "Insumos recomendados (medicamentos/vacunas) de los protocolos",
    TreatmentProtocolInsumo,
    rbac_entity="treatment-protocol-insumos",
)
