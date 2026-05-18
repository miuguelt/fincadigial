"""PDF export helpers for exports_namespace."""
from datetime import date, datetime
from app.utils.tenant_context import get_current_finca_id, apply_tenant_filter


def _build_bulk_health_pdf(animal_ids):
    from fpdf import FPDF
    from app.models.animals import Animals
    from app.models.control import Control
    from app.models.vaccinations import Vaccinations
    from app.models.treatments import Treatments
    from app.models.animalDiseases import AnimalDiseases

    class PDF(FPDF):
        def header(self):
            # Título principal solo en la primera página o cabecera reducida
            self.set_font('Helvetica', 'B', 15)
            self.set_text_color(31, 107, 53)
            self.cell(0, 10, 'FINCA VILLA LUZ - REPORTE DE LOTE SANITARIO', ln=True, align='C')
            self.set_font('Helvetica', 'I', 10)
            self.set_text_color(100)
            self.cell(0, 8, f'Generado el: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', ln=True, align='C')
            self.ln(5)

        def footer(self):
            self.set_y(-15)
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(150)
            self.cell(0, 10, f'Página {self.page_no()}', align='C')

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=20)

    for a_id in animal_ids:
        animal = Animals.get_by_id(a_id)
        if not animal: continue

        pdf.add_page()
        
        controls = Control.query.filter_by(animal_id=a_id).order_by(Control.checkup_date.desc()).limit(10).all()
        vaccinations = Vaccinations.query.filter_by(animal_id=a_id).order_by(Vaccinations.vaccination_date.desc()).limit(10).all()
        treatments = Treatments.query.filter_by(animal_id=a_id).order_by(Treatments.treatment_date.desc()).limit(10).all()
        diseases = AnimalDiseases.query.filter_by(animal_id=a_id).order_by(AnimalDiseases.diagnosis_date.desc()).limit(10).all()

        # Separador Animal
        pdf.set_font('Helvetica', 'B', 14)
        pdf.set_fill_color(240, 245, 240)
        pdf.set_text_color(0)
        pdf.cell(0, 12, f' Ficha Sanitaria: {animal.record}', fill=True, ln=True)
        pdf.ln(2)

        # Grid de Info básica
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(30, 7, "Raza:")
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(60, 7, animal.breed.name if animal.breed else 'N/A')
        
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(30, 7, "Sexo:")
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(60, 7, animal.sex.value)
        pdf.ln()

        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(30, 7, "Peso:")
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(60, 7, f"{animal.weight} kg")
        
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(30, 7, "Edad:")
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(60, 7, f"{animal.age_in_months} meses")
        pdf.ln(10)

        # Tablas
        if controls:
            _add_compact_table(pdf, 'Últimos Controles de Salud', ['Fecha', 'Estado', 'Peso'], 
                              [[c.checkup_date.isoformat(), c.health_status.value, f"{c.weight} kg"] for c in controls])
        
        if vaccinations:
            _add_compact_table(pdf, 'Historial de Vacunación', ['Fecha', 'Vacuna', 'Dosis'], 
                              [[v.vaccination_date.isoformat(), v.vaccine.name if v.vaccine else 'N/A', v.dose] for v in vaccinations])

        if treatments:
             _add_compact_table(pdf, 'Tratamientos Médicos', ['Fecha', 'Medicina', 'Dosis'], 
                              [[t.treatment_date.isoformat(), t.medication.name if t.medication else 'N/A', t.dose] for t in treatments])

    return bytes(pdf.output())


def _add_compact_table(pdf, title, headers, rows):
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(31, 107, 53)
    pdf.cell(0, 8, title, ln=True)
    
    pdf.set_font('Helvetica', 'B', 9)
    pdf.set_fill_color(220, 230, 220)
    pdf.set_text_color(0)
    col_width = (pdf.w - 30) / len(headers)
    
    for h in headers:
        pdf.cell(col_width, 7, h, border=1, fill=True, align='C')
    pdf.ln()
    
    pdf.set_font('Helvetica', '', 9)
    for row in rows:
        for val in row:
            pdf.cell(col_width, 6, str(val), border=1)
        pdf.ln()
    pdf.ln(4)


def _build_health_pdf(animal, controls, vaccinations, treatments, diseases):
    from fpdf import FPDF

    class PDF(FPDF):
        def header(self):
            self.set_font('Helvetica', 'B', 14)
            self.set_fill_color(31, 107, 53)
            self.set_text_color(255, 255, 255)
            self.cell(0, 10, '  Finca Villa Luz — Historial Sanitario', fill=True, new_x='LMARGIN', new_y='NEXT')
            self.ln(2)

        def footer(self):
            self.set_y(-15)
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(128)
            self.cell(0, 10, f'Página {self.page_no()} — Generado el {date.today().strftime("%d/%m/%Y")}', align='C')

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    # ---- Animal info card ----
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_fill_color(235, 245, 235)
    pdf.set_text_color(0)
    pdf.cell(0, 8, 'Información del Animal', fill=True, new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 10)
    pdf.ln(1)

    info_pairs = [
        ('Código', animal.record),
        ('Sexo', _fmt_enum(animal.sex)),
        ('Nacimiento', _fmt_date(animal.birth_date)),
        ('Edad', f"{animal.age_in_months} meses" if animal.age_in_months else '—'),
        ('Peso', f"{animal.weight} kg"),
        ('Estado', _fmt_enum(animal.status)),
        ('Raza', animal.breed.name if animal.breed else '—'),
    ]
    col_w = 87
    for i, (label, value) in enumerate(info_pairs):
        if i % 2 == 0:
            pdf.set_x(15)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(30, 7, label + ':')
        pdf.set_font('Helvetica', '', 10)
        pdf.cell(col_w - 30, 7, str(value))
        if i % 2 == 1:
            pdf.ln()
    if len(info_pairs) % 2 == 1:
        pdf.ln()
    pdf.ln(4)

    # ---- Section helper ----
    def section(title, rows, col_headers, col_widths):
        pdf.set_font('Helvetica', 'B', 11)
        pdf.set_fill_color(31, 107, 53)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 8, f'  {title} ({len(rows)} registros)', fill=True, new_x='LMARGIN', new_y='NEXT')
        pdf.set_text_color(0)

        if not rows:
            pdf.set_font('Helvetica', 'I', 9)
            pdf.set_text_color(120)
            pdf.cell(0, 7, '  Sin registros.', new_x='LMARGIN', new_y='NEXT')
            pdf.set_text_color(0)
            pdf.ln(3)
            return

        # Header row
        pdf.set_font('Helvetica', 'B', 9)
        pdf.set_fill_color(220, 240, 220)
        for h, w in zip(col_headers, col_widths):
            pdf.cell(w, 7, h, border=1, fill=True, align='C')
        pdf.ln()

        # Data rows
        pdf.set_font('Helvetica', '', 9)
        for idx, row in enumerate(rows):
            fill = idx % 2 == 0
            pdf.set_fill_color(248, 252, 248)
            for val, w in zip(row, col_widths):
                pdf.cell(w, 6, str(val), border='B', fill=fill)
            pdf.ln()
        pdf.ln(4)

    # ---- Controls ----
    section(
        'Controles Veterinarios',
        [[_fmt_date(c.checkup_date), _fmt_enum(c.health_status),
          f"{c.weight} kg" if c.weight else '—',
          f"{c.height} cm" if c.height else '—',
          (c.description or '')[:50]] for c in controls],
        ['Fecha', 'Estado', 'Peso', 'Talla', 'Observaciones'],
        [30, 28, 22, 22, 78],
    )

    # ---- Vaccinations ----
    section(
        'Vacunaciones',
        [[_fmt_date(v.vaccination_date),
          v.vaccines.name if v.vaccines else '—',
          _fmt_enum(v.vaccines.type) if v.vaccines else '—',
          v.instructor.fullname if v.instructor else '—'] for v in vaccinations],
        ['Fecha', 'Vacuna', 'Tipo', 'Instructor'],
        [30, 60, 35, 55],
    )

    # ---- Treatments ----
    section(
        'Tratamientos',
        [[_fmt_date(t.treatment_date),
          (t.description or '')[:35],
          t.frequency or '—',
          t.dosis or '—',
          (t.observations or '')[:30]] for t in treatments],
        ['Fecha', 'Descripción', 'Frecuencia', 'Dosis', 'Observaciones'],
        [25, 55, 30, 30, 40],
    )

    # ---- Diseases ----
    section(
        'Diagnósticos / Enfermedades',
        [[_fmt_date(d.diagnosis_date),
          d.disease.name if d.disease else '—',
          d.status or '—',
          (d.notes or '')[:50]] for d in diseases],
        ['Fecha', 'Enfermedad', 'Estado', 'Notas'],
        [30, 50, 25, 75],
    )

    return bytes(pdf.output())
# ---------------------------------------------------------------------------
# Excel: Producción de Leche
# ---------------------------------------------------------------------------

def _build_financial_pdf(finca, txs, total_income, total_expenses):
    from fpdf import FPDF
    
    class PDF(FPDF):
        def header(self):
            self.set_font('Helvetica', 'B', 16)
            self.set_text_color(31, 107, 53)
            self.cell(0, 10, f'REPORTE FINANCIERO - {finca.name.upper()}', ln=True, align='C')
            self.set_font('Helvetica', 'I', 10)
            self.set_text_color(100)
            self.cell(0, 8, f'Generado el: {datetime.now().strftime("%d/%m/%Y %H:%M")}', ln=True, align='C')
            self.ln(10)

    pdf = PDF()
    pdf.add_page()
    
    # Resumen Ejecutivo
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 10, 'Resumen de Balance', ln=True)
    pdf.set_font('Helvetica', '', 12)
    
    pdf.set_text_color(0, 100, 0)
    pdf.cell(100, 8, f'Total Ingresos: ${total_income:,.2f}')
    pdf.ln()
    pdf.set_text_color(150, 0, 0)
    pdf.cell(100, 8, f'Total Gastos: ${total_expenses:,.2f}')
    pdf.ln()
    pdf.set_font('Helvetica', 'B', 12)
    balance = total_income - total_expenses
    pdf.set_text_color(0 if balance >= 0 else 150, 0, 0)
    pdf.cell(100, 10, f'BALANCE NETO: ${balance:,.2f}', border='T')
    pdf.ln(15)
    
    # Tabla de Transacciones
    pdf.set_text_color(0)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.cell(0, 10, 'Detalle de Movimientos', ln=True)
    
    headers = ['Fecha', 'Tipo', 'Categoría', 'Monto']
    col_widths = [30, 30, 70, 60]
    
    pdf.set_font('Helvetica', 'B', 10)
    pdf.set_fill_color(220, 240, 220)
    for h, w in zip(headers, col_widths):
        pdf.cell(w, 8, h, border=1, fill=True, align='C')
    pdf.ln()
    
    pdf.set_font('Helvetica', '', 9)
    for t in txs:
        pdf.cell(30, 7, _fmt_date(t.date), border=1)
        pdf.cell(30, 7, _fmt_enum(t.transaction_type), border=1)
        pdf.cell(70, 7, _fmt_enum(t.category), border=1)
        pdf.cell(60, 7, f"${t.amount:,.2f}", border=1, align='R')
        pdf.ln()
        
    return bytes(pdf.output())
