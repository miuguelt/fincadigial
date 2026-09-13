"""PDF export helpers for exports_namespace."""

from datetime import date, datetime
from app.services.export_excel_helpers import _fmt_date, _fmt_enum


def _fmt_num_co(value, decimals: int = 2) -> str:
    """Format a number using es-CO separators: 2.500.000,00."""
    formatted = f"{value:,.{decimals}f}"
    return formatted.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def _fmt_money_co(value) -> str:
    """Format an amount as Colombian currency: $2.500.000,00."""
    return f"${_fmt_num_co(value, 2)}"


def _build_bulk_health_pdf(animal_ids):
    from fpdf import FPDF
    from app.models.animals import Animals
    from app.models.control import Control
    from app.models.vaccinations import Vaccinations
    from app.models.treatments import Treatments
    from app.models.animalDiseases import AnimalDiseases

    class PDF(FPDF):
        def header(self):
            self.set_fill_color(22, 78, 38)
            self.rect(0, 0, 210, 28, style="F")
            self.set_fill_color(46, 125, 50)
            self.rect(0, 28, 210, 2, style="F")

            self.set_xy(14, 6)
            self.set_font("Helvetica", "B", 15)
            self.set_text_color(255, 255, 255)
            self.cell(100, 6, "HACIENDA VILLA LUZ", new_x="RIGHT", new_y="TOP")

            self.set_xy(14, 14)
            self.set_font("Helvetica", "B", 8)
            self.set_text_color(200, 230, 201)
            self.cell(100, 5, "REPORTE CONSOLIDADO DE LOTE SANITARIO", new_x="RIGHT", new_y="TOP")

            self.set_xy(115, 6)
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(255, 255, 255)
            self.cell(81, 6, "CONTROL VETERINARIO", align="R", new_x="LEFT", new_y="NEXT")

            self.set_x(115)
            self.set_font("Helvetica", "", 7.5)
            self.set_text_color(200, 230, 201)
            self.cell(81, 5, f"Emisión: {datetime.now().strftime('%d/%m/%Y %H:%M')}", align="R", new_x="LEFT", new_y="NEXT")

            self.set_x(115)
            self.set_font("Helvetica", "I", 7)
            self.set_text_color(220, 240, 220)
            self.cell(81, 4, f"Lote: {len(animal_ids)} animales evaluados", align="R")

            self.set_y(34)

        def footer(self):
            self.set_y(-16)
            self.set_font("Helvetica", "I", 7.5)
            self.set_text_color(128, 128, 128)
            self.set_draw_color(224, 224, 224)
            self.set_line_width(0.3)
            self.line(14, self.get_y(), 196, self.get_y())
            self.ln(2)
            self.cell(110, 5, "Hacienda Villa Luz · Control de Sanidad e Historial Clínico", align="L")
            self.cell(0, 5, f"Página {self.page_no()} de {self.alias_nb_pages() or '{nb}'}", align="R")

    pdf = PDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    for a_id in animal_ids:
        animal = Animals.get_by_id(a_id)
        if not animal:
            continue

        pdf.add_page()
        pdf.set_y(34)

        controls = (
            Control.query.filter_by(animal_id=a_id)
            .order_by(Control.checkup_date.desc())
            .limit(10)
            .all()
        )
        vaccinations = (
            Vaccinations.query.filter_by(animal_id=a_id)
            .order_by(Vaccinations.vaccination_date.desc())
            .limit(10)
            .all()
        )
        treatments = (
            Treatments.query.filter_by(animal_id=a_id)
            .order_by(Treatments.treatment_date.desc())
            .limit(10)
            .all()
        )
        diseases = (
            AnimalDiseases.query.filter_by(animal_id=a_id)
            .order_by(AnimalDiseases.diagnosis_date.desc())
            .limit(10)
            .all()
        )

        # Tarjeta Animal
        start_y = pdf.get_y()
        pdf.set_fill_color(248, 251, 248)
        pdf.set_draw_color(200, 220, 200)
        pdf.set_line_width(0.3)
        pdf.rect(14, start_y, 182, 22, "DF")

        pdf.set_xy(18, start_y + 3)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(22, 78, 38)
        pdf.cell(85, 5, f"FICHA SANITARIA: {animal.record or f'ID-{animal.id}'}")

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(20, 5, "Estado:")
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_text_color(22, 101, 52 if animal.status and animal.status.value == "Vivo" else 185, 28, 28)
        pdf.cell(60, 5, animal.status.value if animal.status else "Vivo", ln=True)

        y = start_y + 9
        pdf.set_xy(18, y)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(16, 5, "Raza:")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(40, 5, str(animal.breed.name if animal.breed else "N/A"))

        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(14, 5, "Sexo:")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(30, 5, animal.sex.value if animal.sex else "N/A")

        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(14, 5, "Peso:")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(26, 5, f"{animal.weight:.1f} kg" if animal.weight is not None else "-")

        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(14, 5, "Edad:")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(20, 5, f"{animal.age_in_months} meses" if animal.age_in_months else "-", ln=True)

        pdf.set_y(start_y + 26)

        # Tablas
        if controls:
            _add_compact_table(
                pdf,
                "Últimos Controles de Salud y Pesaje",
                ["Fecha", "Estado de Salud", "Peso Corporal"],
                [
                    [
                        _fmt_date(c.checkup_date),
                        _fmt_enum(c.health_status),
                        f"{c.weight:.1f} kg" if c.weight is not None else "-",
                    ]
                    for c in controls
                ],
            )

        if vaccinations:
            _add_compact_table(
                pdf,
                "Historial de Vacunación",
                ["Fecha", "Vacuna Aplicada", "Dosis Administrada"],
                [
                    [
                        _fmt_date(v.vaccination_date),
                        v.vaccines.name if v.vaccines else "N/A",
                        str(v.dose or "-"),
                    ]
                    for v in vaccinations
                ],
            )

        if treatments:
            _add_compact_table(
                pdf,
                "Tratamientos Médicos y Medicación",
                ["Fecha", "Medicamento / Principio", "Dosis"],
                [
                    [
                        _fmt_date(t.treatment_date),
                        t.medication.name if t.medication else "N/A",
                        str(t.dose or "-"),
                    ]
                    for t in treatments
                ],
            )

    return bytes(pdf.output())


def _add_compact_table(pdf, title, headers, rows):
    if pdf.get_y() > 240:
        pdf.add_page()
        pdf.set_y(34)

    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(0, 6.5, title, ln=True)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(22, 78, 38)
    pdf.set_text_color(255, 255, 255)
    pdf.set_draw_color(22, 78, 38)
    pdf.set_line_width(0.2)
    col_width = (pdf.w - 28) / len(headers)

    for h in headers:
        pdf.cell(col_width, 6.5, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    pdf.set_draw_color(226, 232, 240)
    fill = False
    for row in rows:
        if pdf.get_y() > 265:
            pdf.add_page()
            pdf.set_y(34)
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_fill_color(22, 78, 38)
            pdf.set_text_color(255, 255, 255)
            for h in headers:
                pdf.cell(col_width, 6.5, h, border=1, fill=True, align="C")
            pdf.ln()
            pdf.set_font("Helvetica", "", 8)

        pdf.set_fill_color(248, 252, 248) if fill else pdf.set_fill_color(255, 255, 255)
        pdf.set_text_color(35, 35, 35)

        for val in row:
            text = str(val)
            align = "C" if "/" in text or "-" in text and len(text) == 10 else "R" if "kg" in text or "$" in text else "L"
            pdf.cell(col_width, 6, text, border="B", fill=True, align=align)
        pdf.ln()
        fill = not fill
    pdf.ln(3)


def _build_health_pdf(
    animal, controls, vaccinations, treatments, diseases, progress=None
):
    import os
    import tempfile
    import flask
    from fpdf import FPDF
    from app.models.animals import Sex

    def resolve_image_path(filepath):
        if not filepath:
            return None

        normalized = os.path.normpath(filepath)
        candidates = []
        if os.path.isabs(normalized):
            candidates.append(normalized)
        else:
            app_root = flask.current_app.root_path
            project_root = os.path.normpath(os.path.join(app_root, ".."))
            candidates.extend(
                [
                    os.path.normpath(os.path.join(project_root, normalized)),
                    os.path.normpath(os.path.join(app_root, normalized)),
                    os.path.normpath(os.path.join(os.getcwd(), normalized)),
                ]
            )

        for candidate in candidates:
            if os.path.exists(candidate) and os.path.isfile(candidate):
                return candidate

        if "static/uploads/animals/" in filepath.replace("\\", "/"):
            requested_name = os.path.basename(normalized)
            animals_root = os.path.normpath(
                os.path.join(
                    flask.current_app.root_path, "..", "static", "uploads", "animals"
                )
            )
            for root, _, files in os.walk(animals_root):
                if requested_name in files:
                    candidate = os.path.normpath(os.path.join(root, requested_name))
                    if candidate.startswith(animals_root):
                        return candidate
        return None

    def prepare_pdf_image(path):
        ext = os.path.splitext(path)[1].lower()
        if ext != ".webp":
            return path, None

        try:
            from PIL import Image

            with Image.open(path) as img:
                converted = img.convert("RGB")
                tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
                tmp.close()
                converted.save(tmp.name, "JPEG", quality=90)
                return tmp.name, tmp.name
        except Exception:
            return path, None

    class PDF(FPDF):
        def header(self):
            # Banner superior de marca
            self.set_fill_color(27, 94, 32)  # Verde bosque oscuro #1b5e20
            self.rect(0, 0, 210, 28, style="F")

            # Nombre de la finca y título
            self.set_xy(15, 6)
            self.set_font("Helvetica", "B", 15)
            self.set_text_color(255, 255, 255)
            self.cell(0, 6, "FINCA VILLA LUZ", new_x="LMARGIN", new_y="NEXT")

            self.set_x(15)
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(200, 230, 201)  # Verde claro pastel
            self.cell(
                0,
                5,
                "FICHA GANADERA DE CONTROL SANITARIO",
                new_x="LMARGIN",
                new_y="NEXT",
            )
            self.ln(7)

        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(128, 128, 128)
            # Línea sutil sobre el footer
            self.set_draw_color(224, 224, 224)
            self.set_line_width(0.3)
            self.line(15, self.get_y(), 195, self.get_y())
            self.ln(2)
            self.set_x(15)
            self.cell(
                0,
                10,
                f"Página {self.page_no()} | Finca Villa Luz | Generado el {date.today().strftime('%d/%m/%Y')}",
                align="C",
            )

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_margins(
        15, 28, 15
    )  # Margen superior incrementado para acomodar el banner superior
    pdf.set_y(32)  # Iniciar debajo de la cabecera

    # ---- LAYOUT DE RESUMEN (DOS COLUMNAS) ----
    start_y = pdf.get_y()
    card_height = 68

    # 1. Columna Izquierda: Información Básica (Ancho: 120mm)
    pdf.set_fill_color(241, 248, 233)  # Fondo verde muy suave #f1f8e9
    pdf.rect(15, start_y, 120, card_height, style="F")

    # Borde sutil a la tarjeta
    pdf.set_draw_color(197, 225, 165)  # Verde suave para borde #c5e1a5
    pdf.set_line_width(0.5)
    pdf.rect(15, start_y, 120, card_height, style="D")

    # Contenido de la columna izquierda
    pdf.set_xy(18, start_y + 4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(27, 94, 32)
    pdf.cell(0, 6, f"Datos Generales | {animal.record}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    # Estilo para etiquetas y valores
    pdf.set_text_color(33, 33, 33)  # Gris oscuro

    # Obtener indicador de salud
    hi = animal.health_indicator
    hi_label = "ESTABLE"
    hi_color = (46, 125, 50)  # Verde
    if hi == "critical":
        hi_label = "CRÍTICO"
        hi_color = (198, 40, 40)  # Rojo
    elif hi == "warning":
        hi_label = "ADVERTENCIA"
        hi_color = (255, 143, 0)  # Ámbar

    # Potrero actual
    potrero = getattr(animal, "current_field_name", "Sin potrero")

    info_rows = [
        [
            ("Código:", animal.record),
            ("Raza:", animal.breed.name if animal.breed else "-"),
        ],
        [
            ("Sexo:", _fmt_enum(animal.sex)),
            ("Edad:", f"{animal.age_in_months} meses" if animal.age_in_months else "-"),
        ],
        [
            ("Peso:", f"{animal.weight:.1f} kg" if animal.weight is not None else "-"),
            ("Estado:", _fmt_enum(animal.status)),
        ],
        [("Potrero:", potrero), ("Salud:", hi_label)],
    ]

    for row in info_rows:
        pdf.set_x(18)
        # Primer par (Columna 1 de la sub-tabla interna)
        label1, val1 = row[0]
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(18, 6, label1)
        pdf.set_font("Helvetica", "", 9)

        # Si es potrero y el texto es muy largo, truncar o ajustar
        if label1 == "Potrero:" and len(str(val1)) > 16:
            val1 = str(val1)[:14] + ".."
        pdf.cell(38, 6, str(val1))

        # Segundo par (Columna 2 de la sub-tabla interna)
        label2, val2 = row[1]
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(15, 6, label2)

        if label2 == "Salud:":
            # Pintar badge de salud de color
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(*hi_color)
            pdf.cell(30, 6, val2)
            pdf.set_text_color(33, 33, 33)
        else:
            pdf.set_font("Helvetica", "", 9)
            # Truncar raza si es extremadamente larga
            if label2 == "Raza:" and len(str(val2)) > 16:
                val2 = str(val2)[:14] + ".."
            pdf.cell(30, 6, str(val2))

        pdf.ln(6.5)

    # 2. Columna Derecha: Foto del Animal (Ancho: 55mm, Espacio: 5mm)
    photo_rendered = False
    primary_image = animal.images.filter_by(is_primary=True).first()
    if not primary_image:
        primary_image = animal.images.first()

    photo_x = 140
    photo_w = 55

    if primary_image and primary_image.filepath:
        full_path = resolve_image_path(primary_image.filepath)
        if full_path:
            image_path, temp_path = prepare_pdf_image(full_path)
            try:
                # Dibujamos un marco estético alrededor de la foto
                pdf.set_draw_color(197, 225, 165)
                pdf.set_line_width(0.5)
                pdf.rect(photo_x, start_y, photo_w, card_height, style="D")

                # Insertamos la imagen (dejando un margen de 1mm)
                # w=53, h=66 para que quepa en el recuadro
                pdf.image(
                    image_path,
                    x=photo_x + 1,
                    y=start_y + 1,
                    w=photo_w - 2,
                    h=card_height - 2,
                )
                photo_rendered = True
            except Exception as e:
                # Registrar error silenciosamente y usar fallback
                pass
            finally:
                if temp_path:
                    try:
                        os.remove(temp_path)
                    except OSError:
                        pass

    if not photo_rendered:
        # Fallback estético: Caja gris claro con leyenda
        pdf.set_fill_color(245, 245, 245)
        pdf.set_draw_color(224, 224, 224)
        pdf.set_line_width(0.5)
        pdf.rect(photo_x, start_y, photo_w, card_height, style="FD")

        pdf.set_xy(photo_x, start_y + (card_height / 2) - 6)
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(128, 128, 128)
        pdf.cell(photo_w, 5, "Sin Registro", ln=1, align="C")
        pdf.set_x(photo_x)
        pdf.cell(photo_w, 5, "Fotográfico", ln=1, align="C")

    pdf.set_y(start_y + card_height + 5)

    # ---- SECCIÓN DE GENEALOGÍA Y REPRODUCCIÓN (LAYOUT DOBLE COLUMNA ANCHO 87mm cada una) ----
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(27, 94, 32)
    pdf.cell(0, 7, "Genealogía y Reproducción", new_x="LMARGIN", new_y="NEXT")

    # Línea divisoria sutil
    pdf.set_draw_color(220, 230, 220)
    pdf.set_line_width(0.5)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(2.5)

    gen_y = pdf.get_y()
    gen_height = 25

    # Sub-caja Izquierda: Genealogía
    pdf.set_fill_color(252, 252, 252)
    pdf.set_draw_color(235, 235, 235)
    pdf.rect(15, gen_y, 87, gen_height, style="FD")

    pdf.set_xy(18, gen_y + 3)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(81, 4, "GENEALOGÍA", new_x="LMARGIN", new_y="NEXT")

    father_record = animal.father.record if animal.father else "No registrado"
    mother_record = animal.mother.record if animal.mother else "No registrada"

    pdf.set_x(18)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(33, 33, 33)
    pdf.cell(20, 6, "Padre:")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(61, 6, father_record, new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(18)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(20, 6, "Madre:")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(61, 6, mother_record)

    # Sub-caja Derecha: Datos Reproductivos u Otros Datos
    pdf.rect(108, gen_y, 87, gen_height, style="FD")
    pdf.set_xy(111, gen_y + 3)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(100, 100, 100)

    if (
        animal.sex == Sex.Hembra
        or str(animal.sex) == "Sex.Hembra"
        or str(animal.sex) == "Hembra"
    ):
        pdf.cell(81, 4, "DATOS REPRODUCTIVOS", new_x="LMARGIN", new_y="NEXT")

        preg_status = "Preñada" if animal.is_pregnant else "Vacía / No Preñada"
        lact_status = "En Lactancia" if animal.is_lactating else "Seca"
        calving_str = (
            _fmt_date(animal.last_calving_date) if animal.last_calving_date else "-"
        )

        pdf.set_x(111)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(33, 33, 33)
        pdf.cell(32, 6, "Estado Gestación:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(49, 6, preg_status, new_x="LMARGIN", new_y="NEXT")

        pdf.set_x(111)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(32, 6, "Lactancia / Últ. Parto:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(49, 6, f"{lact_status} ({calving_str})")
    else:
        pdf.cell(81, 4, "DATOS ADICIONALES (MACHO)", new_x="LMARGIN", new_y="NEXT")

        entry_str = _fmt_date(animal.entry_date) if animal.entry_date else "-"
        purchase_str = (
            _fmt_date(animal.purchase_date)
            if animal.purchase_date
            else "Nacimiento en Finca"
        )

        pdf.set_x(111)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(33, 33, 33)
        pdf.cell(30, 6, "F. de Ingreso:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(51, 6, entry_str, new_x="LMARGIN", new_y="NEXT")

        pdf.set_x(111)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(30, 6, "Adquisición:")
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(51, 6, purchase_str)

    pdf.set_y(gen_y + gen_height + 5)

    # ---- TABLAS DE EVENTOS SANITARIOS ----
    def section(title, rows, col_headers, col_widths):
        # Asegurar espacio mínimo antes de imprimir la sección
        # Si queda menos de 45mm de página, forzar salto de página
        if pdf.get_y() > 240:
            pdf.add_page()

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(27, 94, 32)
        pdf.cell(
            0, 8, f"{title} ({len(rows)} registros)", new_x="LMARGIN", new_y="NEXT"
        )
        pdf.set_text_color(33, 33, 33)

        if not rows:
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(117, 117, 117)
            pdf.cell(
                0,
                6,
                "Sin registros históricos registrados.",
                new_x="LMARGIN",
                new_y="NEXT",
            )
            pdf.set_text_color(33, 33, 33)
            pdf.ln(2.5)
            return

        # Cabecera de la tabla
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(27, 94, 32)  # Cabecera verde oscuro
        pdf.set_text_color(255, 255, 255)
        pdf.set_draw_color(27, 94, 32)
        pdf.set_line_width(0.3)

        for h, w in zip(col_headers, col_widths):
            pdf.cell(w, 7, h, border=1, fill=True, align="C")
        pdf.ln()

        # Datos
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(33, 33, 33)
        pdf.set_draw_color(224, 224, 224)  # Bordes gris claro para filas

        for idx, row in enumerate(rows):
            # Salto de página automático si se acaba el espacio de la fila
            if pdf.get_y() > 270:
                pdf.add_page()
                # Volver a imprimir cabeceras
                pdf.set_font("Helvetica", "B", 9)
                pdf.set_fill_color(27, 94, 32)
                pdf.set_text_color(255, 255, 255)
                pdf.set_draw_color(27, 94, 32)
                for h, w in zip(col_headers, col_widths):
                    pdf.cell(w, 7, h, border=1, fill=True, align="C")
                pdf.ln()
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(33, 33, 33)
                pdf.set_draw_color(224, 224, 224)

            fill = idx % 2 == 0
            pdf.set_fill_color(248, 252, 248)  # Fondo alterno suave

            # Dibujar celdas con manejo de desbordamiento de ancho
            for val, w in zip(row, col_widths):
                # Truncar texto si excede el ancho estimado para la celda
                text = str(val)
                max_chars = int(w * 0.45)  # Estimación de caracteres legibles
                if len(text) > max_chars:
                    text = text[: max_chars - 2] + ".."
                pdf.cell(
                    w,
                    6,
                    text,
                    border="B",
                    fill=fill,
                    align="C" if "/" in text or "kg" in text or "cm" in text else "L",
                )
            pdf.ln()
        pdf.ln(3.5)

    # ---- Controles ----
    section(
        "Controles Veterinarios / Pesajes",
        [
            [
                _fmt_date(c.checkup_date),
                _fmt_enum(c.health_status),
                f"{c.weight:.1f} kg" if c.weight is not None else "-",
                f"{c.height:.1f} cm" if c.height is not None else "-",
                c.description or "Sin observaciones",
            ]
            for c in controls
        ],
        ["Fecha", "Estado", "Peso", "Talla", "Observaciones Checkup"],
        [25, 25, 20, 20, 90],
    )

    # ---- Vacunaciones ----
    section(
        "Historial de Vacunación",
        [
            [
                _fmt_date(v.vaccination_date),
                v.vaccines.name if v.vaccines else "-",
                _fmt_enum(v.vaccines.type) if v.vaccines else "-",
                v.instructor.fullname if v.instructor else "-",
            ]
            for v in vaccinations
        ],
        ["Fecha", "Vacuna Aplicada", "Tipo Vacuna", "Instructor Responsable"],
        [25, 55, 45, 55],
    )

    # ---- Treatments ----
    section(
        "Tratamientos Médicos Suministrados",
        [
            [
                _fmt_date(t.treatment_date),
                t.description or "-",
                t.frequency or "-",
                t.dosis or "-",
                t.observations or "-",
            ]
            for t in treatments
        ],
        ["Fecha", "Descripción Tratamiento", "Frecuencia", "Dosis", "Observaciones"],
        [22, 53, 30, 30, 45],
    )

    # ---- Seguimiento clínico (avances del episodio de enfermedad) ----
    if progress:
        rows = []
        for p in progress:
            disease_name = (
                p.episode.disease.name if p.episode and p.episode.disease else "-"
            )
            observation = p.observation or ""
            if observation and disease_name != "-":
                observation = f"{disease_name}: {observation}"
            elif observation:
                observation = observation
            rows.append(
                [
                    _fmt_date(p.progress_date),
                    f"{p.weight} kg" if p.weight is not None else "-",
                    f"{p.temperature} °C" if p.temperature is not None else "-",
                    p.status or "-",
                    observation,
                ]
            )
        section(
            "Seguimiento Clínico del Caso (Avances)",
            rows,
            ["Fecha", "Peso", "Temp", "Estado", "Observación"],
            [25, 22, 22, 32, 79],
        )

    # ---- Diseases ----
    section(
        "Historial de Diagnósticos / Enfermedades",
        [
            [
                _fmt_date(d.diagnosis_date),
                d.disease.name if d.disease else "-",
                d.status or "-",
                d.severity or "-",
                _fmt_date(d.recovery_date) if d.recovery_date else "En curso",
                d.notes or "-",
            ]
            for d in diseases
        ],
        [
            "Fecha",
            "Diagnóstico / Enfermedad",
            "Estado actual",
            "Gravedad",
            "Alta",
            "Notas Veterinarias",
        ],
        [24, 48, 26, 20, 20, 42],
    )

    return bytes(pdf.output())


# ---------------------------------------------------------------------------
# Excel: Producción de Leche
# ---------------------------------------------------------------------------


def _build_financial_pdf(finca, txs, total_income, total_expenses):
    from fpdf import FPDF
    from datetime import datetime

    class PDF(FPDF):
        def header(self):
            # Franja institucional verde bosque profundo (#164e26)
            self.set_fill_color(22, 78, 38)
            self.rect(0, 0, 210, 32, "F")
            self.set_fill_color(46, 125, 50)
            self.rect(0, 32, 210, 2.5, "F")

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
            self.cell(100, 5, f"Predio: {finca.name.upper()} | Registro Contable Oficial", new_x="RIGHT", new_y="TOP")

            self.set_xy(115, 7)
            self.set_font("Helvetica", "B", 11)
            self.set_text_color(255, 255, 255)
            self.cell(81, 7, "ESTADO FINANCIERO CONSOLIDADO", align="R", new_x="LEFT", new_y="NEXT")

            now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
            self.set_x(115)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(200, 230, 201)
            self.cell(81, 5, f"Emisión: {now_str}", align="R", new_x="LEFT", new_y="NEXT")

            self.set_x(115)
            self.set_font("Helvetica", "I", 7.5)
            self.set_text_color(220, 240, 220)
            self.cell(81, 5, "Documento Contable y Operativo", align="R")

            self.set_y(40)

        def footer(self):
            self.set_y(-18)
            self.set_font("Helvetica", "I", 7.5)
            self.set_text_color(120, 120, 120)
            self.set_draw_color(210, 215, 220)
            self.set_line_width(0.3)
            self.line(14, self.get_y(), 196, self.get_y())
            self.ln(2.5)
            self.cell(110, 4.5, f"Hacienda Villa Luz · Finca: {finca.name} · Libro Oficial de Ingresos y Egresos", align="L")
            self.cell(0, 4.5, f"Página {self.page_no()} de {self.alias_nb_pages() or '{nb}'}", align="R", ln=True)

    pdf = PDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=22)
    pdf.add_page()

    # Resumen Ejecutivo Financiero
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(0, 7, "RESUMEN DE BALANCE Y LIQUIDEZ OPERATIVA", ln=True)

    start_y = pdf.get_y() + 2
    balance = total_income - total_expenses

    # Tarjeta Saldo Neto
    pdf.set_fill_color(22, 78, 38) if balance >= 0 else pdf.set_fill_color(185, 28, 28)
    pdf.rect(14, start_y, 88, 25, "F")
    pdf.set_xy(18, start_y + 4)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(200, 230, 201)
    pdf.cell(80, 4, "BALANCE NETO DISPONIBLE:")
    pdf.set_xy(18, start_y + 11)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(80, 8, _fmt_money_co(balance))

    # Tarjetas Ingresos y Gastos
    pdf.set_fill_color(248, 251, 248)
    pdf.set_draw_color(200, 220, 200)
    pdf.rect(106, start_y, 90, 25, "DF")

    pdf.set_xy(110, start_y + 3)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(22, 101, 52)
    pdf.cell(42, 5, "Total Ingresos:")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(40, 5, _fmt_money_co(total_income), align="R", ln=True)

    pdf.set_xy(110, start_y + 11)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(185, 28, 28)
    pdf.cell(42, 5, "Total Egresos:")
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(40, 5, _fmt_money_co(total_expenses), align="R", ln=True)

    pdf.set_xy(110, start_y + 18)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(82, 4, f"Transacciones en periodo: {len(txs)} movimientos", align="R")

    pdf.set_y(start_y + 32)

    # Tabla de Transacciones
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(22, 78, 38)
    pdf.cell(0, 7, "DETALLE CRONOLOGICO DE TRANSACCIONES", ln=True)

    headers = ["Fecha", "Tipo", "Categoría", "Monto", "Descripción"]
    col_widths = [26, 24, 42, 34, 56]

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_fill_color(22, 78, 38)
    pdf.set_text_color(255, 255, 255)
    pdf.set_draw_color(22, 78, 38)
    for h, w in zip(headers, col_widths):
        pdf.cell(w, 8, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    pdf.set_draw_color(226, 232, 240)
    fill = False

    for t in txs:
        if pdf.get_y() > 255:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 8.5)
            pdf.set_fill_color(22, 78, 38)
            pdf.set_text_color(255, 255, 255)
            for h, w in zip(headers, col_widths):
                pdf.cell(w, 8, h, border=1, fill=True, align="C")
            pdf.ln()
            pdf.set_font("Helvetica", "", 8)

        pdf.set_fill_color(248, 252, 248) if fill else pdf.set_fill_color(255, 255, 255)
        pdf.set_text_color(35, 35, 35)

        tx_type_str = _fmt_enum(t.transaction_type)
        is_inc = "ingreso" in tx_type_str.lower()
        desc = getattr(t, "description", None) or "-"
        if len(desc) > 35:
            desc = desc[:32] + "..."

        pdf.cell(26, 7, _fmt_date(t.date), border="B", fill=True, align="C")

        # Tipo con color
        if is_inc:
            pdf.set_text_color(22, 101, 52)
            pdf.set_font("Helvetica", "B", 8)
        else:
            pdf.set_text_color(185, 28, 28)
            pdf.set_font("Helvetica", "B", 8)
        pdf.cell(24, 7, tx_type_str, border="B", fill=True, align="C")

        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(35, 35, 35)
        pdf.cell(42, 7, _fmt_enum(t.category), border="B", fill=True)
        pdf.cell(34, 7, _fmt_money_co(t.amount), border="B", fill=True, align="R")
        pdf.cell(56, 7, desc, border="B", fill=True)
        pdf.ln()
        fill = not fill

    # Firmas
    y = pdf.get_y() + 10
    if y > 240:
        pdf.add_page()
        y = 50

    pdf.set_draw_color(100, 116, 139)
    pdf.set_line_width(0.4)
    pdf.line(25, y, 90, y)
    pdf.set_xy(25, y + 2)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(65, 4.5, "Firma Administrador / Contador", align="C", ln=True)

    pdf.line(120, y, 185, y)
    pdf.set_xy(120, y + 2)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(65, 4.5, "Firma Propietario / Gerente", align="C", ln=True)

    return bytes(pdf.output())


def _build_multi_finca_general_pdf(fincas_data, user_fullname):
    from fpdf import FPDF
    from datetime import datetime

    class PDF(FPDF):
        def header(self):
            self.set_font("Helvetica", "B", 16)
            self.set_text_color(31, 107, 53)  # Villa Luz Green
            self.cell(0, 10, "SISTEMA DE GESTIÓN FINCA DIGITAL", ln=True, align="C")
            self.set_font("Helvetica", "B", 12)
            self.set_text_color(100)
            self.cell(
                0, 8, "REPORTE COMPARATIVO GENERAL MULTI-FINCA", ln=True, align="C"
            )
            self.ln(5)

        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(150)
            self.cell(
                0,
                10,
                f"Página {self.page_no()} | Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} por {user_fullname}",
                align="C",
            )

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    # Resumen Consolidado
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0)
    pdf.cell(0, 8, "Resumen Consolidado", ln=True)
    pdf.ln(2)

    total_fincas = len(fincas_data)
    total_animals = sum(f["total_animals"] for f in fincas_data)
    total_milk = sum(f["total_milk"] for f in fincas_data)
    total_income = sum(f["total_income"] for f in fincas_data)
    total_expenses = sum(f["total_expenses"] for f in fincas_data)
    # Suma de los balances ya redondeados por finca, para que el consolidado
    # coincida al centavo con la columna "Neto" de la tabla de abajo.
    net_balance = sum(f["net_balance"] for f in fincas_data)

    # Grid de Resumen
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(45, 7, f"Total Fincas: {total_fincas}")
    pdf.cell(45, 7, f"Total Animales: {_fmt_num_co(total_animals, 0)}")
    pdf.cell(45, 7, f"Total Leche: {_fmt_num_co(total_milk, 1)} L")
    pdf.ln()
    pdf.cell(60, 7, f"Total Ingresos: {_fmt_money_co(total_income)}")
    pdf.cell(60, 7, f"Total Egresos: {_fmt_money_co(total_expenses)}")
    pdf.cell(60, 7, f"Balance Consolidado: {_fmt_money_co(net_balance)}")
    pdf.ln(10)

    # Tabla Comparativa de Fincas
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Tabla Comparativa de Fincas", ln=True)
    pdf.ln(2)

    headers = [
        "Finca",
        "Ubicación",
        "Animales",
        "Leche (L)",
        "Ingresos ($)",
        "Egresos ($)",
        "Neto ($)",
    ]
    col_widths = [
        35,
        35,
        20,
        22,
        23,
        23,
        22,
    ]  # Sum = 180 (fits within margin of 15 each side of 210 A4 width)

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(220, 240, 220)
    for h, w in zip(headers, col_widths):
        pdf.cell(w, 8, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for idx, f in enumerate(fincas_data):
        fill = idx % 2 == 0
        pdf.set_fill_color(248, 252, 248)

        # Safe string formats
        finca_name = f["name"]
        location = f["location"]
        if len(finca_name) > 18:
            finca_name = finca_name[:16] + ".."
        if len(location) > 18:
            location = location[:16] + ".."

        pdf.cell(35, 7, finca_name, border=1, fill=fill)
        pdf.cell(35, 7, location, border=1, fill=fill)
        pdf.cell(
            20, 7, _fmt_num_co(f["total_animals"], 0), border=1, fill=fill, align="C"
        )
        pdf.cell(22, 7, _fmt_num_co(f["total_milk"], 1), border=1, fill=fill, align="R")
        pdf.cell(
            23, 7, _fmt_money_co(f["total_income"]), border=1, fill=fill, align="R"
        )
        pdf.cell(
            23, 7, _fmt_money_co(f["total_expenses"]), border=1, fill=fill, align="R"
        )
        pdf.cell(22, 7, _fmt_money_co(f["net_balance"]), border=1, fill=fill, align="R")
        pdf.ln()

    return bytes(pdf.output())


def _build_finca_detail_pdf(finca, stats, user_fullname):
    from fpdf import FPDF
    from datetime import datetime

    class PDF(FPDF):
        def header(self):
            self.set_font("Helvetica", "B", 16)
            self.set_text_color(31, 107, 53)
            self.cell(
                0, 10, f"REPORTE DETALLADO - {finca.name.upper()}", ln=True, align="C"
            )
            self.set_font("Helvetica", "I", 10)
            self.set_text_color(100)
            nit_str = f"NIT: {finca.nit}" if finca.nit else ""
            ica_str = f"ICA: {finca.ica_registration}" if finca.ica_registration else ""
            loc_str = f"{finca.municipality or ''}, {finca.department or ''}".strip(
                ", "
            )
            self.cell(0, 6, f"{nit_str}  {ica_str}  |  {loc_str}", ln=True, align="C")
            self.ln(5)

        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(150)
            self.cell(
                0,
                10,
                f"Página {self.page_no()} | Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} por {user_fullname}",
                align="C",
            )

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    # Información Básica
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0)
    pdf.cell(0, 8, "Resumen de Inventario y KPIs", ln=True)
    pdf.ln(2)

    # Grid de Información de Finca
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(45, 7, "Tipo de Finca:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(45, 7, finca.type.value if finca.type else "Sin tipo")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(45, 7, "Total Animales:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        90,
        7,
        f"{_fmt_num_co(stats['total_animals'], 0)} "
        f"(Machos: {_fmt_num_co(stats['total_males'], 0)}, "
        f"Hembras: {_fmt_num_co(stats['total_females'], 0)})",
    )
    pdf.ln()

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(45, 7, "Total Potreros:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(45, 7, f"{stats['total_fields']}")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(45, 7, "Área Total:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(45, 7, f"{_fmt_num_co(stats['total_area'], 2)} ha")
    pdf.ln()

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(45, 7, "Producción de Leche:")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        90,
        7,
        f"{_fmt_num_co(stats['total_milk'], 1)} L "
        f"(Promedio por ordeño registrado: {_fmt_num_co(stats['avg_milk'], 1)} L)",
    )
    pdf.ln(10)

    # Información Financiera
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Balance Financiero", ln=True)
    pdf.ln(2)

    net_balance = stats["net_balance"]
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(60, 7, f"Total Ingresos: {_fmt_money_co(stats['total_income'])}")
    pdf.cell(60, 7, f"Total Egresos: {_fmt_money_co(stats['total_expenses'])}")

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(0, 100, 0) if net_balance >= 0 else pdf.set_text_color(150, 0, 0)
    pdf.cell(60, 7, f"Balance Neto: {_fmt_money_co(net_balance)}")
    pdf.set_text_color(0)
    pdf.ln(10)

    # Últimos Movimientos Financieros
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Últimos Movimientos Financieros (Recientes)", ln=True)
    pdf.ln(2)

    headers = ["Fecha", "Tipo", "Categoría", "Monto", "Descripción"]
    col_widths = [25, 25, 40, 30, 60]  # Sum = 180

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(220, 240, 220)
    for h, w in zip(headers, col_widths):
        pdf.cell(w, 8, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for idx, tx in enumerate(stats["recent_transactions"]):
        fill = idx % 2 == 0
        pdf.set_fill_color(248, 252, 248)

        # Truncate description if too long
        desc = tx["description"]
        if len(desc) > 35:
            desc = desc[:32] + "..."

        # tx['type'] ya viene con el valor del enum en español ("Ingreso"/"Gasto").
        pdf.cell(25, 7, _fmt_date(tx["date"]), border=1, fill=fill, align="C")
        pdf.cell(25, 7, tx["type"], border=1, fill=fill, align="C")
        pdf.cell(40, 7, tx["category"], border=1, fill=fill)
        pdf.cell(30, 7, _fmt_money_co(tx["amount"]), border=1, fill=fill, align="R")
        pdf.cell(60, 7, desc, border=1, fill=fill)
        pdf.ln()

    return bytes(pdf.output())
