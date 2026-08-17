from fpdf import FPDF
from datetime import datetime


class ICAReportPDF(FPDF):
    def __init__(self, finca_name, report_type, finca_type="Tradicional"):
        super().__init__()
        self.finca_name = finca_name
        self.report_type = report_type
        self.finca_type = finca_type
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        self.set_fill_color(22, 78, 38)
        self.rect(0, 0, 210, 40, "F")

        self.set_fill_color(34, 110, 50)  # Verde medio
        self.rect(0, 35, 210, 5, "F")

        self.set_xy(10, 10)
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, "_projects/villaluz", ln=True)

        self.set_font("Helvetica", "", 10)
        self.cell(0, 5, "ECOSISTEMA GANADERO INTELIGENTE", ln=True)

        self.set_xy(140, 15)
        self.set_font("Helvetica", "B", 12)
        title = (
            "REPORTE DE PRÁCTICAS - FINCA EDUCATIVA"
            if self.finca_type == "Educativa"
            else "REPORTE OFICIAL ICA"
        )
        self.cell(60, 10, title, align="R", ln=True)
        self.set_xy(140, 22)
        self.set_font("Helvetica", "", 8)
        self.cell(
            60, 5, f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", align="R"
        )

        self.set_y(50)

    def footer(self):
        self.set_y(-25)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)

        # Línea divisoria
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(2)

        self.cell(
            0,
            5,
            f"Finca: {self.finca_name} | Documento verificado por DevBrain AI Core",
            align="C",
            ln=True,
        )
        self.cell(0, 5, f"Página {self.page_no()} de {{nb}}", align="C")

    def add_finca_section(self, finca_data):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(31, 107, 53)
        self.cell(0, 10, f"{self.report_type}", ln=True)

        # Caja de información de la finca con bordes suaves
        self.ln(5)
        self.set_fill_color(245, 248, 245)
        self.set_draw_color(200, 220, 200)
        self.rect(10, self.get_y(), 190, 30, "DF")

        curr_y = self.get_y() + 5
        self.set_xy(15, curr_y)

        # Columna 1
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(50, 50, 50)
        self.cell(30, 7, "Nombre Finca:")
        self.set_font("Helvetica", "", 10)
        self.cell(60, 7, finca_data.get("name", "N/A"))

        # Columna 2
        self.set_font("Helvetica", "B", 10)
        self.cell(30, 7, "Propietario:")
        self.set_font("Helvetica", "", 10)
        self.cell(60, 7, finca_data.get("owner", "N/A"), ln=True)

        self.set_x(15)
        self.set_font("Helvetica", "B", 10)
        self.cell(30, 7, "Ubicación:")
        self.set_font("Helvetica", "", 10)
        self.cell(60, 7, finca_data.get("ubication", "N/A"))

        self.set_font("Helvetica", "B", 10)
        self.cell(30, 7, "Registro ICA:")
        self.set_font("Helvetica", "", 10)
        self.cell(60, 7, finca_data.get("ica_registration", "PENDIENTE"), ln=True)

        self.set_y(curr_y + 30)
        self.ln(10)

    def draw_styled_table(self, headers, data, col_widths):
        # Header de tabla
        self.set_fill_color(31, 107, 53)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 9)

        for i, header in enumerate(headers):
            self.cell(col_widths[i], 10, header, border=0, fill=True, align="C")
        self.ln()

        # Datos
        self.set_font("Helvetica", "", 8)
        self.set_text_color(40, 40, 40)
        fill = False

        for row in data:
            if self.get_y() > 250:
                self.add_page()
                # Re-dibujar header
                self.set_fill_color(31, 107, 53)
                self.set_text_color(255, 255, 255)
                self.set_font("Helvetica", "B", 9)
                for i, header in enumerate(headers):
                    self.cell(col_widths[i], 10, header, border=0, fill=True, align="C")
                self.ln()
                self.set_font("Helvetica", "", 8)
                self.set_text_color(40, 40, 40)

            self.set_fill_color(250, 252, 250) if not fill else self.set_fill_color(
                255, 255, 255
            )
            row_height = 8

            for i, header in enumerate(headers):
                key = header.lower().replace(" ", "_")
                val = str(row.get(key, ""))
                if len(val) > 28:
                    val = val[:25] + "..."
                self.cell(
                    col_widths[i], row_height, val, border="B", fill=True, align="C"
                )
            self.ln()
            fill = not fill

    def add_signatures(self):
        self.ln(20)
        y = self.get_y()
        if y > 240:
            self.add_page()
            y = 60

        self.set_draw_color(100, 100, 100)
        self.set_text_color(50, 50, 50)
        self.set_font("Helvetica", "", 9)

        self.line(20, y + 15, 80, y + 15)
        self.set_xy(20, y + 17)
        self.cell(60, 5, "Firma Propietario / Responsable", align="C")

        self.line(130, y + 15, 190, y + 15)
        self.set_xy(130, y + 17)
        self.cell(60, 5, "Firma Médico Veterinario / ICA", align="C")


def _finalize_pdf(pdf):
    result = pdf.output()
    if isinstance(result, (bytes, bytearray)):
        return bytes(result)
    return result.encode("latin1")


def generate_inventory_pdf(
    finca_name, finca_data, animals_data, finca_type="Tradicional"
):
    pdf = ICAReportPDF(finca_name, "Inventario General de Ganado", finca_type)
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.add_finca_section(finca_data)

    headers = [
        "Numero Arete",
        "Especie",
        "Raza",
        "Sexo",
        "Edad Meses",
        "Peso Kg",
        "Estado",
    ]
    col_widths = [35, 25, 30, 20, 25, 25, 30]

    pdf.draw_styled_table(headers, animals_data, col_widths)
    pdf.add_signatures()
    return _finalize_pdf(pdf)


def generate_movements_pdf(
    finca_name, finca_data, movements_data, finca_type="Tradicional"
):
    pdf = ICAReportPDF(finca_name, "Registro de Movimientos (Trazabilidad)", finca_type)
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.add_finca_section(finca_data)

    headers = [
        "Fecha",
        "Tipo Movimiento",
        "Numero Arete",
        "Sexo",
        "Detalle",
        "Destino Origen",
    ]
    col_widths = [25, 35, 30, 20, 40, 40]

    pdf.draw_styled_table(headers, movements_data, col_widths)
    pdf.add_signatures()
    return _finalize_pdf(pdf)


def generate_health_pdf(finca_name, finca_data, health_data, finca_type="Tradicional"):
    pdf = ICAReportPDF(finca_name, "Historial Sanitario y Vacunación", finca_type)
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.add_finca_section(finca_data)

    headers = [
        "Fecha",
        "Tipo Registro",
        "Numero Arete",
        "Producto",
        "Dosis",
        "Veterinario",
    ]
    col_widths = [25, 35, 30, 35, 25, 40]

    pdf.draw_styled_table(headers, health_data, col_widths)
    pdf.add_signatures()
    return _finalize_pdf(pdf)


def generate_animal_cv_pdf(finca_name, animal_data, kpis, reproductive_history):
    """Genera una Hoja de Vida profesional para un animal."""
    pdf = ICAReportPDF(
        finca_name, f"Hoja de Vida: {animal_data.get('record', 'Animal')}"
    )
    pdf.alias_nb_pages()
    pdf.add_page()

    # Header de información básica
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(31, 107, 53)
    pdf.cell(0, 10, "Información del Animal", ln=True)

    pdf.set_fill_color(245, 248, 245)
    pdf.rect(10, pdf.get_y(), 190, 45, "F")

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.set_xy(15, pdf.get_y() + 5)
    fs = kpis.get("frame_score")
    if isinstance(fs, (int, float)):
        fs_str = f"{fs:.1f}"
    elif fs is not None:
        try:
            fs_str = f"{float(fs):.1f}"
        except (ValueError, TypeError):
            fs_str = str(fs)
    else:
        fs_str = "N/A"

    fields = [
        ("Record:", animal_data.get("record")),
        ("Raza:", animal_data.get("breed", {}).get("name", "N/A")),
        ("Sexo:", animal_data.get("sex")),
        ("F. Nacimiento:", animal_data.get("birth_date")),
        ("Frame Score:", fs_str),
        ("Estado:", animal_data.get("status")),
    ]

    for idx, (label, val) in enumerate(fields):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(30, 7, label)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(60, 7, str(val))
        if idx % 2 != 0:
            pdf.ln()
            pdf.set_x(15)

    pdf.set_y(pdf.get_y() + 15)

    # Sección de Inteligencia Ganadera
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(31, 107, 53)
    pdf.cell(0, 10, "Indicadores de Inteligencia Ganadera", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(
        0,
        5,
        "Estos indicadores son calculados proactivamente para medir la eficiencia del animal en la finca.",
    )
    pdf.ln(5)

    intel_headers = ["Métrica", "Valor", "Estado/Alerta"]
    intel_data = [
        {
            "métrica": "Días Abiertos",
            "valor": str(kpis.get("open_days", 0)),
            "estado/alerta": "Normal" if kpis.get("open_days", 0) < 90 else "Crítico",
        },
        {
            "métrica": "Intervalo Partos",
            "valor": str(kpis.get("calving_interval", 0)) + " días",
            "estado/alerta": "-",
        },
        {
            "métrica": "Días en Leche",
            "valor": str(kpis.get("days_in_milk", 0)),
            "estado/alerta": "Producción Activa"
            if kpis.get("days_in_milk", 0) > 0
            else "-",
        },
        {
            "métrica": "Tiempo Retiro",
            "valor": str(kpis.get("withdrawal_remaining", 0)) + " días",
            "estado/alerta": "CON RESTRICCIÓN"
            if kpis.get("is_withdrawing")
            else "Apto Consumo",
        },
    ]
    pdf.draw_styled_table(intel_headers, intel_data, [60, 60, 70])

    # Historial Reproductivo
    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Historial de Partos y Servicios", ln=True)

    repro_headers = ["Fecha", "Evento", "Toro/Cría", "Detalle"]
    pdf.draw_styled_table(repro_headers, reproductive_history, [40, 40, 40, 70])

    pdf.add_signatures()
    return _finalize_pdf(pdf)


def generate_financial_statement_pdf(finca_name, financial_data):
    """Genera un Estado de Cuenta (Monedero) para el productor."""
    pdf = ICAReportPDF(finca_name, "Estado de Cuenta Campesino")
    pdf.alias_nb_pages()
    pdf.add_page()

    # Resumen Balance
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(31, 107, 53)
    pdf.cell(0, 15, "Resumen del Monedero", ln=True)

    pdf.set_fill_color(31, 107, 53)  # Fondo verde para balance
    pdf.rect(10, pdf.get_y(), 190, 25, "F")
    pdf.set_xy(15, pdf.get_y() + 7)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(80, 10, "SALDO DISPONIBLE:")
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(100, 10, f"$ {financial_data.get('balance', 0):,.2f}", align="R", ln=True)

    pdf.set_y(pdf.get_y() + 15)
    pdf.ln(5)

    # Detalles Ingresos y Egresos
    pdf.set_text_color(50, 50, 50)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(95, 10, f"Total Ingresos: $ {financial_data.get('total_income', 0):,.2f}")
    pdf.cell(
        95,
        10,
        f"Total Gastos: $ {financial_data.get('total_expenses', 0):,.2f}",
        ln=True,
    )
    pdf.ln(5)

    # Tabla de Movimientos
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(31, 107, 53)
    pdf.cell(0, 10, "Historial de Movimientos Detallado", ln=True)

    headers = ["Fecha", "Categoría", "Descripción", "Tipo", "Monto"]
    col_widths = [30, 40, 60, 20, 40]

    # Transformar datos para la tabla
    table_data = []
    for item in financial_data.get("history", []):
        table_data.append(
            {
                "fecha": item.get("expense_date"),
                "categoría": item.get("category"),
                "descripción": item.get("description"),
                "tipo": "Ingreso" if item.get("is_income") else "Gasto",
                "monto": f"$ {item.get('amount', 0):,.2f}",
            }
        )

    pdf.draw_styled_table(headers, table_data, col_widths)

    pdf.add_signatures()
    return _finalize_pdf(pdf)
