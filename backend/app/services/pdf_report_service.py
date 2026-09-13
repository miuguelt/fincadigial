"""Servicio de generación de reportes PDF profesionales para Villa Luz OS.

Produce documentos oficiales para:
- Inventario general de ganado (formato compatible ICA).
- Registro de movimientos y trazabilidad (entradas, salidas, nacimientos, muertes).
- Historial sanitario, tratamientos y vacunación.
- Hoja de Vida / Ficha técnica individual del animal.
- Estado de cuenta campesino / Balance financiero.
"""

from datetime import datetime
from fpdf import FPDF


def _fmt_money(amount: float) -> str:
    """Formatea moneda colombiana: $ 1.250.000,00."""
    try:
        val = float(amount or 0)
        formatted = f"{val:,.2f}"
        return f"$ {formatted.replace(',', chr(0)).replace('.', ',').replace(chr(0), '.')}"
    except (ValueError, TypeError):
        return "$ 0,00"


def _fmt_number(val, decimals: int = 1) -> str:
    """Formatea número con separadores colombianos."""
    try:
        num = float(val or 0)
        formatted = f"{num:,.{decimals}f}"
        return formatted.replace(',', chr(0)).replace('.', ',').replace(chr(0), '.')
    except (ValueError, TypeError):
        return str(val or "")


class ICAReportPDF(FPDF):
    """Generador PDF de reportes institucionales para Hacienda Villa Luz."""

    def __init__(self, finca_name: str, report_type: str, finca_type: str = "Tradicional"):
        super().__init__()
        self.finca_name = finca_name or "Finca Villa Luz"
        self.report_type = report_type
        self.finca_type = finca_type
        self.set_auto_page_break(auto=True, margin=22)

    def header(self):
        # Franja superior verde bosque profundo (#164e26)
        self.set_fill_color(22, 78, 38)
        self.rect(0, 0, 210, 32, "F")

        # Línea de acento inferior en verde esmeralda (#2e7d32)
        self.set_fill_color(46, 125, 50)
        self.rect(0, 32, 210, 2.5, "F")

        # Título principal y submarca
        self.set_xy(14, 7)
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(255, 255, 255)
        self.cell(100, 8, "HACIENDA VILLA LUZ", new_x="RIGHT", new_y="TOP")

        self.set_xy(14, 16)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(200, 230, 201)
        self.cell(100, 5, "SISTEMA DE GESTION GANADERA INTELIGENTE", new_x="RIGHT", new_y="TOP")

        self.set_xy(14, 22)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(220, 240, 220)
        self.cell(100, 5, f"Predio: {self.finca_name} | Modalidad: {self.finca_type}", new_x="RIGHT", new_y="TOP")

        # Bloque derecho: Título del reporte y metadatos
        self.set_xy(115, 7)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(255, 255, 255)

        title = self.report_type.upper()
        if len(title) > 36:
            title = title[:33] + "..."
        self.cell(81, 7, title, align="R", new_x="LEFT", new_y="NEXT")

        now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.set_x(115)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(200, 230, 201)
        self.cell(81, 5, f"Emision: {now_str}", align="R", new_x="LEFT", new_y="NEXT")

        self.set_x(115)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(220, 240, 220)
        self.cell(81, 5, "Documento Oficial de Registro Ganadero", align="R")

        self.set_y(40)

    def footer(self):
        self.set_y(-18)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(120, 120, 120)

        # Línea divisoria sutil
        self.set_draw_color(210, 215, 220)
        self.set_line_width(0.3)
        self.line(14, self.get_y(), 196, self.get_y())
        self.ln(2.5)

        # Información de trazabilidad
        self.cell(
            110,
            4.5,
            f"Hacienda Villa Luz · Finca: {self.finca_name} · Registro Oficial de Control",
            align="L",
        )
        self.cell(0, 4.5, f"Pagina {self.page_no()} de {{nb}}", align="R", ln=True)

    def add_finca_section(self, finca_data: dict):
        """Añade tarjeta formal con datos del predio ganadero."""
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(22, 78, 38)
        self.cell(0, 7, self.report_type, ln=True)

        self.ln(2)
        start_y = self.get_y()

        # Recuadro suave con borde
        self.set_fill_color(248, 251, 248)
        self.set_draw_color(200, 220, 200)
        self.set_line_width(0.4)
        self.rect(14, start_y, 182, 28, "DF")

        y = start_y + 4
        self.set_xy(18, y)

        # Fila 1
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(60, 70, 60)
        self.cell(28, 6, "Nombre Finca:")
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(20, 20, 20)
        self.cell(62, 6, str(finca_data.get("name") or self.finca_name))

        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(60, 70, 60)
        self.cell(26, 6, "Propietario:")
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(20, 20, 20)
        self.cell(60, 6, str(finca_data.get("owner", "N/A")), ln=True)

        # Fila 2
        y += 7
        self.set_xy(18, y)
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(60, 70, 60)
        self.cell(28, 6, "Ubicacion:")
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(20, 20, 20)
        self.cell(62, 6, str(finca_data.get("ubication", "N/A")))

        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(60, 70, 60)
        self.cell(26, 6, "Registro ICA:")
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(20, 20, 20)
        self.cell(60, 6, str(finca_data.get("ica_registration", "PENDIENTE")), ln=True)

        # Fila 3
        y += 7
        self.set_xy(18, y)
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(60, 70, 60)
        self.cell(28, 6, "Tipo Predio:")
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(20, 20, 20)
        self.cell(62, 6, self.finca_type)

        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(60, 70, 60)
        self.cell(26, 6, "Estado Sanitario:")
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(46, 125, 50)
        self.cell(60, 6, "PREDIO CERTIFICADO (ICA) / VIGENTE", ln=True)

        self.set_y(start_y + 33)

    def draw_styled_table(self, headers, data, col_widths, alignments=None):
        """Dibuja una tabla elegante con cabeceras institucionales, filas alternadas y saltos de página."""
        if not alignments:
            alignments = ["C" if "fecha" in h.lower() or "arete" in h.lower() or "sexo" in h.lower() or "edad" in h.lower()
                          else "R" if "peso" in h.lower() or "monto" in h.lower() or "saldo" in h.lower() or "litros" in h.lower() or "dosis" in h.lower()
                          else "L" for h in headers]

        def print_header():
            self.set_fill_color(22, 78, 38)
            self.set_text_color(255, 255, 255)
            self.set_font("Helvetica", "B", 8.5)
            self.set_line_width(0.2)
            self.set_draw_color(22, 78, 38)

            for i, header in enumerate(headers):
                self.cell(col_widths[i], 8, header, border=1, fill=True, align="C")
            self.ln()

        print_header()

        self.set_font("Helvetica", "", 8)
        self.set_text_color(35, 35, 35)
        fill = False

        if not data:
            self.set_fill_color(250, 250, 250)
            self.set_draw_color(230, 230, 230)
            total_w = sum(col_widths)
            self.cell(total_w, 9, "No se registran datos para el periodo seleccionado.", border="B", fill=True, align="C")
            self.ln()
            return

        for row in data:
            if self.get_y() > 255:
                self.add_page()
                print_header()
                self.set_font("Helvetica", "", 8)
                self.set_text_color(35, 35, 35)

            if fill:
                self.set_fill_color(248, 252, 248)
            else:
                self.set_fill_color(255, 255, 255)

            row_height = 7.5
            self.set_draw_color(226, 232, 240)
            self.set_line_width(0.2)

            for i, header in enumerate(headers):
                key = header.lower().replace(" ", "_")
                val = str(row.get(key, ""))
                align = alignments[i] if i < len(alignments) else "L"

                max_chars = int(col_widths[i] * 0.45)
                if len(val) > max_chars and max_chars > 5:
                    val = val[:max_chars - 3] + "..."

                if key in ("estado", "estado/alerta"):
                    if any(k in val.lower() for k in ["critico", "vencid", "restr"]):
                        self.set_text_color(190, 20, 20)
                        self.set_font("Helvetica", "B", 8)
                    elif any(k in val.lower() for k in ["al dia", "normal", "apto", "activ"]):
                        self.set_text_color(22, 101, 52)
                        self.set_font("Helvetica", "B", 8)
                    else:
                        self.set_text_color(60, 60, 60)
                        self.set_font("Helvetica", "", 8)
                else:
                    self.set_text_color(35, 35, 35)
                    self.set_font("Helvetica", "", 8)

                self.cell(col_widths[i], row_height, val, border="B", fill=True, align=align)

            self.ln()
            fill = not fill

        self.ln(3)

    def add_signatures(self):
        """Añade bloque de firmas oficiales con líneas y sellos."""
        y = self.get_y() + 8
        if y > 240:
            self.add_page()
            y = 50

        self.set_fill_color(248, 250, 252)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.rect(14, y, 182, 14, "DF")

        self.set_xy(18, y + 3)
        self.set_font("Helvetica", "B", 7.5)
        self.set_text_color(71, 85, 105)
        self.cell(174, 4, "CERTIFICACION OFICIAL GANADERA:", ln=True)
        self.set_x(18)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(100, 116, 139)
        self.cell(174, 4, "Los datos consignados corresponden fielmente a los registros biologicos y operativos del sistema Villa Luz.")

        y += 26
        self.set_draw_color(100, 116, 139)
        self.set_line_width(0.4)

        self.line(25, y, 90, y)
        self.set_xy(25, y + 2)
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(30, 41, 59)
        self.cell(65, 4.5, "Firma Propietario / Administrador", align="C", ln=True)
        self.set_x(25)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(100, 116, 139)
        self.cell(65, 4, "C.C. / Representante Legal", align="C")

        self.line(120, y, 185, y)
        self.set_xy(120, y + 2)
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(30, 41, 59)
        self.cell(65, 4.5, "Firma Medico Veterinario / ICA", align="C", ln=True)
        self.set_x(120)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(100, 116, 139)
        self.cell(65, 4, "Tarjeta Profesional / Registro ICA", align="C")


def _finalize_pdf(pdf: FPDF) -> bytes:
    """Retorna los bytes binarios del PDF."""
    result = pdf.output()
    if isinstance(result, (bytes, bytearray)):
        return bytes(result)
    return result.encode("latin1")


def generate_inventory_pdf(finca_name, finca_data, animals_data, finca_type="Tradicional") -> bytes:
    """Genera reporte de inventario general de ganado."""
    pdf = ICAReportPDF(finca_name, "Inventario General de Ganado", finca_type)
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.add_finca_section(finca_data)

    total = len(animals_data)
    machos = sum(1 for a in animals_data if str(a.get("sexo", "")).lower().startswith("m"))
    hembras = sum(1 for a in animals_data if str(a.get("sexo", "")).lower().startswith("h"))

    pdf.set_fill_color(240, 248, 240)
    pdf.set_draw_color(200, 230, 200)
    pdf.rect(14, pdf.get_y(), 182, 12, "DF")
    pdf.set_xy(18, pdf.get_y() + 3)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(55, 6, f"TOTAL REGISTRADOS: {total} animales")
    pdf.cell(55, 6, f"HEMBRAS: {hembras}")
    pdf.cell(55, 6, f"MACHOS: {machos}", ln=True)
    pdf.ln(4)

    headers = [
        "Numero Arete",
        "Especie",
        "Raza",
        "Sexo",
        "Edad Meses",
        "Peso Kg",
        "Ubicacion",
        "Estado",
    ]
    col_widths = [28, 20, 26, 16, 20, 20, 28, 24]

    pdf.draw_styled_table(headers, animals_data, col_widths)
    pdf.add_signatures()
    return _finalize_pdf(pdf)


def generate_movements_pdf(finca_name, finca_data, movements_data, finca_type="Tradicional") -> bytes:
    """Genera reporte de movimientos de ganado (trazabilidad legal)."""
    pdf = ICAReportPDF(finca_name, "Registro de Movimientos y Trazabilidad", finca_type)
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
    col_widths = [24, 32, 26, 18, 42, 40]

    pdf.draw_styled_table(headers, movements_data, col_widths)
    pdf.add_signatures()
    return _finalize_pdf(pdf)


def generate_health_pdf(finca_name, finca_data, health_data, finca_type="Tradicional") -> bytes:
    """Genera reporte sanitario, vacunaciones y tratamientos."""
    pdf = ICAReportPDF(finca_name, "Historial Sanitario y Vacunacion", finca_type)
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
    col_widths = [24, 30, 26, 40, 22, 40]

    pdf.draw_styled_table(headers, health_data, col_widths)
    pdf.add_signatures()
    return _finalize_pdf(pdf)


def generate_animal_cv_pdf(finca_name: str, animal_data: dict, kpis: dict, reproductive_history: list) -> bytes:
    """Genera la Hoja de Vida / Ficha Tecnica profesional de un animal."""
    record = animal_data.get("record") or f"ID-{animal_data.get('id', 'S/N')}"
    pdf = ICAReportPDF(finca_name, f"Hoja de Vida: {record}")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(0, 7, f"FICHA BIOMETRICA Y GENEALOGICA: {record}", ln=True)

    start_y = pdf.get_y() + 2
    pdf.set_fill_color(248, 251, 248)
    pdf.set_draw_color(200, 220, 200)
    pdf.set_line_width(0.3)
    pdf.rect(14, start_y, 182, 42, "DF")

    fs = kpis.get("frame_score")
    if isinstance(fs, (int, float)):
        fs_str = f"{fs:.1f}"
    elif fs:
        fs_str = str(fs)
    else:
        fs_str = "N/A"

    breed_name = animal_data.get("breed", {}).get("name") if isinstance(animal_data.get("breed"), dict) else str(animal_data.get("breed") or "Por definir")
    species_name = animal_data.get("species", {}).get("name") if isinstance(animal_data.get("species"), dict) else str(animal_data.get("species") or "Bovino")
    weight_val = animal_data.get("weight")
    weight_str = f"{weight_val:.1f} kg" if isinstance(weight_val, (int, float)) else (f"{weight_val} kg" if weight_val else "Sin pesaje")

    fields_left = [
        ("Numero Arete:", record),
        ("Raza / Especie:", f"{breed_name} / {species_name}"),
        ("Sexo:", str(animal_data.get("sex", "N/A"))),
        ("F. Nacimiento:", str(animal_data.get("birth_date", "N/A"))),
        ("Edad Aprox.:", f"{animal_data.get('age_in_months', 'N/A')} meses" if animal_data.get("age_in_months") else "N/A"),
    ]

    fields_right = [
        ("Peso Actual:", weight_str),
        ("Frame Score:", fs_str),
        ("Padre (Toro):", str(animal_data.get("father_record") or animal_data.get("idFather") or "N/A")),
        ("Madre (Vaca):", str(animal_data.get("mother_record") or animal_data.get("idMother") or "N/A")),
        ("Estado Actual:", str(animal_data.get("status", "Vivo"))),
    ]

    y_cursor = start_y + 4
    for (lbl_l, val_l), (lbl_r, val_r) in zip(fields_left, fields_right):
        pdf.set_xy(18, y_cursor)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(28, 5.5, lbl_l)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(58, 5.5, val_l[:28])

        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(28, 5.5, lbl_r)
        pdf.set_font("Helvetica", "B" if "Estado" in lbl_r or "Peso" in lbl_r else "", 8)
        if "Estado" in lbl_r:
            pdf.set_text_color(22, 78, 38)
        else:
            pdf.set_text_color(15, 23, 42)
        pdf.cell(58, 5.5, val_r[:28], ln=True)
        y_cursor += 7

    pdf.set_y(start_y + 48)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(0, 7, "INDICADORES BIOLOGICOS Y DE PRODUCTIVIDAD", ln=True)

    intel_headers = ["Metrica", "Valor Medido", "Estado/Alerta"]
    withdrawal_rem = kpis.get("withdrawal_remaining", 0)
    is_withdrawing = kpis.get("is_withdrawing", False) or withdrawal_rem > 0

    intel_data = [
        {
            "metrica": "Dias Abiertos (Periodo Interparto)",
            "valor_medido": f"{kpis.get('open_days', 0)} dias",
            "estado/alerta": "Normal" if kpis.get("open_days", 0) < 90 else "Critico / Atencion",
        },
        {
            "metrica": "Intervalo entre Partos (IEP)",
            "valor_medido": f"{kpis.get('calving_interval', 0)} dias",
            "estado/alerta": "Optimo" if 0 < kpis.get("calving_interval", 0) <= 400 else "Regular",
        },
        {
            "metrica": "Dias en Leche (Lactancia Activa)",
            "valor_medido": f"{kpis.get('days_in_milk', 0)} dias",
            "estado/alerta": "Produccion Activa" if kpis.get("days_in_milk", 0) > 0 else "Seca / En reposo",
        },
        {
            "metrica": "Tiempo de Retiro Sanitario",
            "valor_medido": f"{withdrawal_rem} dias restantes",
            "estado/alerta": "CON RESTRICCION" if is_withdrawing else "Apto Consumo / Ordeño",
        },
    ]
    pdf.draw_styled_table(intel_headers, intel_data, [65, 55, 62])

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(0, 7, "HISTORIAL REPRODUCTIVO Y SERVICIOS REGISTRADOS", ln=True)

    repro_headers = ["Fecha", "Evento", "Toro/Cria", "Detalle"]
    clean_repro = []
    for r in reproductive_history:
        clean_repro.append({
            "fecha": str(r.get("fecha", "")),
            "evento": str(r.get("evento", "")),
            "toro/cria": str(r.get("toro/cría") or r.get("toro/cria") or "-"),
            "detalle": str(r.get("detalle", "-")),
        })

    pdf.draw_styled_table(repro_headers, clean_repro, [30, 45, 45, 62])

    pdf.add_signatures()
    return _finalize_pdf(pdf)


def generate_financial_statement_pdf(finca_name: str, financial_data: dict) -> bytes:
    """Genera Estado de Cuenta Campesino formal en PDF."""
    pdf = ICAReportPDF(finca_name, "Estado de Cuenta Campesino")
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(0, 7, "RESUMEN FINANCIERO Y LIQUIDEZ DISPONIBLE", ln=True)

    start_y = pdf.get_y() + 2
    balance = float(financial_data.get("balance", 0))
    income = float(financial_data.get("total_income", 0))
    expenses = float(financial_data.get("total_expenses", 0))

    # Tarjeta de Saldo Disponible (verde esmeralda)
    pdf.set_fill_color(22, 78, 38)
    pdf.rect(14, start_y, 88, 24, "F")
    pdf.set_xy(18, start_y + 4)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(200, 230, 201)
    pdf.cell(80, 4, "SALDO NETO DISPONIBLE:")
    pdf.set_xy(18, start_y + 10)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(80, 8, _fmt_money(balance))

    # Tarjetas de Ingresos y Gastos
    pdf.set_fill_color(248, 251, 248)
    pdf.set_draw_color(200, 220, 200)
    pdf.rect(106, start_y, 90, 24, "DF")

    pdf.set_xy(110, start_y + 3)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(22, 101, 52)
    pdf.cell(40, 5, "Total Ingresos:")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(42, 5, _fmt_money(income), align="R", ln=True)

    pdf.set_xy(110, start_y + 11)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(185, 28, 28)
    pdf.cell(40, 5, "Total Gastos:")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(42, 5, _fmt_money(expenses), align="R", ln=True)

    pdf.set_xy(110, start_y + 18)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(100, 116, 139)
    tx_count = len(financial_data.get("history", []))
    pdf.cell(82, 4, f"Transacciones analizadas: {tx_count}", align="R")

    pdf.set_y(start_y + 30)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(0, 7, "DETALLE DE INGRESOS Y GASTOS REGISTRADOS", ln=True)

    headers = ["Fecha", "Tipo", "Categoria", "Monto", "Descripcion"]
    col_widths = [26, 22, 38, 34, 62]

    table_data = []
    for item in financial_data.get("history", []):
        is_inc = item.get("is_income", False)
        amt = float(item.get("amount", 0))
        table_data.append({
            "fecha": str(item.get("expense_date") or item.get("date") or ""),
            "tipo": "Ingreso" if is_inc else "Gasto",
            "categoria": str(item.get("category", "General")),
            "monto": _fmt_money(amt),
            "descripcion": str(item.get("description", "Sin detalle")),
        })

    pdf.draw_styled_table(headers, table_data, col_widths)
    pdf.add_signatures()
    return _finalize_pdf(pdf)
