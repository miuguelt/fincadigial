"""
Regulatory Reports Namespace (ICA/SENA)
=========================================

Endpoints para generar reportes regulatorios requeridos por
ICA (Instituto Colombiano Agropecuario) y SENA para fincas tradicionales.

Tipos de reportes:
- Inventario de ganado
- Movimientos (nacimientos, muertes, ventas, traslados)
- Sanidad (vacunaciones, tratamientos, controles)

Uso:
    GET  /api/v1/regulatory-reports/inventory?format=csv&date_from=2024-01-01
    GET  /api/v1/regulatory-reports/movements?format=pdf&type=births
    GET  /api/v1/regulatory-reports/health?format=csv&type=vaccinations
"""

import csv
from io import StringIO
import logging
import flask
from flask import Response
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource, fields

from app.services.regulatory_reports_service import RegulatoryReportsService
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id, get_current_finca_type

logger = logging.getLogger(__name__)

# Namespace
regulatory_ns = Namespace(
    "regulatory-reports", description="Reportes regulatorios ICA/SENA"
)

# =============================================================================
# Modelos para documentación Swagger
# =============================================================================

inventory_report_model = regulatory_ns.model(
    "InventoryReportRequest",
    {
        "date_from": fields.String(
            description="Fecha inicio (YYYY-MM-DD)", example="2024-01-01"
        ),
        "date_to": fields.String(
            description="Fecha fin (YYYY-MM-DD)", example="2024-12-31"
        ),
        "format": fields.String(description="Formato: csv, pdf, json", example="csv"),
        "species": fields.String(description="Filtrar por especie", example="Bovino"),
    },
)

movements_report_model = regulatory_ns.model(
    "MovementsReportRequest",
    {
        "date_from": fields.String(description="Fecha inicio", example="2024-01-01"),
        "date_to": fields.String(description="Fecha fin", example="2024-12-31"),
        "format": fields.String(description="Formato: csv, pdf, json", example="csv"),
        "type": fields.String(
            description="Tipo: births, deaths, sales, transfers, all", example="all"
        ),
    },
)

health_report_model = regulatory_ns.model(
    "HealthReportModel",
    {
        "date_from": fields.String(description="Fecha inicio", example="2024-01-01"),
        "date_to": fields.String(description="Fecha fin", example="2024-12-31"),
        "format": fields.String(description="Formato: csv, pdf, json", example="csv"),
        "type": fields.String(
            description="Tipo: vaccinations, treatments, controls, all", example="all"
        ),
    },
)


# =============================================================================
# Utilidades para exportación
# =============================================================================


def send_csv_response(rows, headers, filename):
    """Devuelve un CSV descargable con columnas estables aunque no haya filas."""
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows or []:
        writer.writerow({header: row.get(header, "") for header in headers})

    return Response(
        output.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
    )


def format_report_response(result, default_message):
    """Encapsula la respuesta según el formato solicitado (csv, pdf o json)."""
    if result["type"] == "csv":
        return send_csv_response(
            result["data"], result["headers"], result["filename"]
        )
    if result["type"] == "pdf":
        return Response(
            result["content"],
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={result['filename']}"
            },
        )

    payload = result["payload"]
    if "total_animals" in payload:
        count = payload["total_animals"]
        noun = "animales"
    else:
        count = payload.get(
            "total_records",
            len(payload.get("movements") or payload.get("health_records") or []),
        )
        noun = "registros"

    return APIResponse.success(
        message=f"{default_message}: {count} {noun}",
        data=payload,
    )


@regulatory_ns.route("/inventory")
class InventoryReportResource(Resource):
    """Reporte de inventario de ganado (formato ICA)."""

    @jwt_required()
    @regulatory_ns.doc("inventory_report", security="jwt")
    @regulatory_ns.expect(inventory_report_model)
    @regulatory_ns.response(200, "Reporte de inventario")
    @regulatory_ns.response(401, "No autenticado")
    @regulatory_ns.response(403, "Solo fincas tradicionales")
    def get(self):
        """Generar reporte de inventario de ganado."""
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error("No hay finca seleccionada", status_code=400)

            finca_type = get_current_finca_type()
            if finca_type not in ["Tradicional", "Educativa"]:
                return APIResponse.forbidden(
                    "Los reportes regulatorios solo aplican a fincas tradicionales o educativas"
                )

            date_from = flask.request.args.get("date_from")
            date_to = flask.request.args.get("date_to")
            format_type = flask.request.args.get("format", "json").lower()
            species_filter = flask.request.args.get("species")

            result = RegulatoryReportsService.get_inventory_report(
                finca_id=finca_id,
                date_from_str=date_from,
                date_to_str=date_to,
                format_type=format_type,
                species_filter=species_filter,
            )
            return format_report_response(result, "Reporte de inventario generado")

        except Exception as e:
            logger.error(f"Error generando reporte de inventario: {e}", exc_info=True)
            return APIResponse.error(
                "Error al generar reporte", details={"error": str(e)}, status_code=500
            )


@regulatory_ns.route("/movements")
class MovementsReportResource(Resource):
    """Reporte de movimientos de ganado (nacimientos, muertes, ventas, traslados)."""

    @jwt_required()
    @regulatory_ns.doc("movements_report", security="jwt")
    @regulatory_ns.expect(movements_report_model)
    @regulatory_ns.response(200, "Reporte de movimientos")
    def get(self):
        """Generar reporte de movimientos de ganado."""
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error("No hay finca seleccionada", status_code=400)

            finca_type = get_current_finca_type()
            if finca_type not in ["Tradicional", "Educativa"]:
                return APIResponse.forbidden(
                    "Los reportes regulatorios solo aplican a fincas tradicionales o educativas"
                )

            date_from = flask.request.args.get("date_from")
            date_to = flask.request.args.get("date_to")
            format_type = flask.request.args.get("format", "json").lower()
            movement_type = flask.request.args.get("type", "all").lower()

            result = RegulatoryReportsService.get_movements_report(
                finca_id=finca_id,
                date_from_str=date_from,
                date_to_str=date_to,
                format_type=format_type,
                movement_type=movement_type,
            )
            return format_report_response(result, "Reporte de movimientos generado")

        except Exception as e:
            logger.error(f"Error generando reporte de movimientos: {e}", exc_info=True)
            return APIResponse.error(
                "Error al generar reporte", details={"error": str(e)}, status_code=500
            )


@regulatory_ns.route("/health")
class HealthReportResource(Resource):
    """Reporte de sanidad (vacunaciones, tratamientos, controles)."""

    @jwt_required()
    @regulatory_ns.doc("health_report", security="jwt")
    @regulatory_ns.expect(health_report_model)
    @regulatory_ns.response(200, "Reporte sanitario")
    def get(self):
        """Generar reporte de sanidad."""
        try:
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error("No hay finca seleccionada", status_code=400)

            finca_type = get_current_finca_type()
            if finca_type not in ["Tradicional", "Educativa"]:
                return APIResponse.forbidden(
                    "Los reportes regulatorios solo aplican a fincas tradicionales o educativas"
                )

            date_from = flask.request.args.get("date_from")
            date_to = flask.request.args.get("date_to")
            format_type = flask.request.args.get("format", "json").lower()
            health_type = flask.request.args.get("type", "all").lower()

            result = RegulatoryReportsService.get_health_report(
                finca_id=finca_id,
                date_from_str=date_from,
                date_to_str=date_to,
                format_type=format_type,
                health_type=health_type,
            )
            return format_report_response(result, "Reporte de sanidad generado")

        except Exception as e:
            logger.error(f"Error generando reporte de sanidad: {e}", exc_info=True)
            return APIResponse.error(
                "Error al generar reporte", details={"error": str(e)}, status_code=500
            )


@regulatory_ns.route("/formats")
class ReportFormatsResource(Resource):
    """Obtener formatos disponibles y ejemplos."""

    @jwt_required()
    @regulatory_ns.doc("report_formats", security="jwt")
    def get(self):
        """Obtener información sobre los formatos de reportes disponibles y ejemplos."""
        return APIResponse.success(
            message="Formatos de reportes regulatorios",
            data={
                "reports": {
                    "inventory": {
                        "description": "Inventario de ganado activo",
                        "formats": ["json", "csv"],
                        "required_by": "ICA",
                        "frequency": "Mensual o trimestral",
                        "fields": [
                            "numero_arete",
                            "arete_sinigan",
                            "especie",
                            "raza",
                            "sexo",
                            "fecha_nacimiento",
                            "edad_meses",
                            "peso_kg",
                            "ubicacion",
                        ],
                    },
                    "movements": {
                        "description": "Movimientos (nacimientos, muertes, ventas, traslados)",
                        "formats": ["json", "csv"],
                        "required_by": "ICA",
                        "frequency": "Mensual",
                        "types": ["births", "deaths", "sales", "transfers", "all"],
                        "fields": [
                            "fecha",
                            "tipo_movimiento",
                            "numero_arete",
                            "arete_sinigan",
                            "sexo",
                            "detalle",
                            "destino_origen",
                            "documento_soporte",
                        ],
                    },
                    "health": {
                        "description": "Registros sanitarios (vacunaciones, tratamientos)",
                        "formats": ["json", "csv"],
                        "required_by": "ICA",
                        "frequency": "Según plan sanitario",
                        "types": ["vaccinations", "treatments", "controls", "all"],
                        "fields": [
                            "fecha",
                            "tipo_registro",
                            "numero_arete",
                            "producto",
                            "dosis",
                            "lote",
                            "veterinario",
                        ],
                    },
                },
                "examples": {
                    "inventory_csv": "/api/v1/regulatory-reports/inventory?format=csv&date_from=2024-01-01",
                    "movements_births": "/api/v1/regulatory-reports/movements?type=births&format=csv",
                    "health_vaccinations": "/api/v1/regulatory-reports/health?type=vaccinations&format=csv",
                },
            },
        )
