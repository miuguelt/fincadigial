"""CSV helpers for regulatory_reports_namespace."""
import csv
import io
from datetime import datetime
import flask


def generate_csv(data: list, headers: list) -> str:
    """Generar contenido CSV desde lista de diccionarios."""
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()


def send_csv_response(data: list, headers: list, filename: str) -> Response:
    """Enviar respuesta como archivo CSV."""
    csv_content = generate_csv(data, headers)
    return Response(
        csv_content,
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename={filename}.csv',
            'Content-Type': 'text/csv; charset=utf-8'
        }
    )


def parse_date(date_str: str) -> datetime:
    """Parsear fecha desde string."""
    try:
        return datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return None


# =============================================================================
# Endpoints
# =============================================================================

