"""
Tests unitarios exhaustivos para servicios de generación de reportes PDF.
Valida calidad, ausencia de cadenas residuales y validez de la estructura binaria PDF.
"""

import unittest
from datetime import date, datetime
from app.services.pdf_report_service import (
    generate_inventory_pdf,
    generate_movements_pdf,
    generate_health_pdf,
    generate_animal_cv_pdf,
    generate_financial_statement_pdf,
)
from app.services.export_pdf_helpers import (
    _build_financial_pdf,
    _fmt_money_co,
    _fmt_num_co,
)


class DummyFinca:
    def __init__(self, name="Finca Villa Luz"):
        self.name = name
        self.nit = "900.123.456-7"
        self.ica_registration = "ICA-2024-001"
        self.municipality = "Montería"
        self.department = "Córdoba"
        self.type = None


class DummyTransaction:
    def __init__(self, date_val, tx_type, category, amount, description=""):
        self.date = date_val
        self.transaction_type = tx_type
        self.category = category
        self.amount = amount
        self.description = description


class TestReportServices(unittest.TestCase):
    def setUp(self):
        self.finca_info = {
            "name": "Hacienda Villa Luz",
            "owner": "Don Carlos Restrepo",
            "ubication": "Montería, Córdoba",
            "ica_registration": "ICA-998822",
        }

    def _assert_valid_pdf(self, pdf_bytes: bytes, min_size: int = 1000):
        self.assertIsInstance(pdf_bytes, (bytes, bytearray))
        self.assertGreater(len(pdf_bytes), min_size)
        # Cabecera estándar de documento PDF
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"), "El archivo no inicia con la cabecera estándar %PDF-")
        # Verificar que no contenga cadenas corruptas o no autorizadas
        self.assertNotIn(b"_projects/villaluz", pdf_bytes, "Contiene ruta residual '_projects/villaluz'")
        self.assertNotIn(b"DevBrain AI Core", pdf_bytes, "Contiene mención no autorizada de IA")

    def test_generate_inventory_pdf(self):
        animals = [
            {
                "numero_arete": "VL-001",
                "especie": "Bovino",
                "raza": "Brahman Blanco",
                "sexo": "Hembra",
                "edad_meses": 24,
                "peso_kg": "420.5",
                "ubicacion": "Potrero El Prado",
                "estado": "Vivo",
            },
            {
                "numero_arete": "VL-002",
                "especie": "Bovino",
                "raza": "Gyr Lechero",
                "sexo": "Macho",
                "edad_meses": 36,
                "peso_kg": "650.0",
                "ubicacion": "Potrero Principal",
                "estado": "Vivo",
            },
        ]
        pdf = generate_inventory_pdf("Hacienda Villa Luz", self.finca_info, animals)
        self._assert_valid_pdf(pdf)

    def test_generate_movements_pdf(self):
        movements = [
            {
                "fecha": "2026-03-01",
                "tipo_movimiento": "NACIMIENTO",
                "numero_arete": "VL-010",
                "sexo": "Hembra",
                "detalle": "Parto natural sin complicaciones",
                "destino_origen": "Potrero Maternidad",
            },
            {
                "fecha": "2026-03-05",
                "tipo_movimiento": "VENTA",
                "numero_arete": "VL-005",
                "sexo": "Macho",
                "detalle": "Subasta ganadera local",
                "destino_origen": "Comprador AgroSur",
            },
        ]
        pdf = generate_movements_pdf("Hacienda Villa Luz", self.finca_info, movements)
        self._assert_valid_pdf(pdf)

    def test_generate_health_pdf(self):
        health = [
            {
                "fecha": "2026-02-15",
                "tipo_registro": "VACUNACION",
                "numero_arete": "VL-001",
                "producto": "Aftogan Bivalente",
                "dosis": "2 ml",
                "veterinario": "Dr. Fernando Morales",
            },
            {
                "fecha": "2026-02-20",
                "tipo_registro": "TRATAMIENTO",
                "numero_arete": "VL-002",
                "producto": "Ivermectina 1%",
                "dosis": "5 ml",
                "veterinario": "Dr. Fernando Morales",
            },
        ]
        pdf = generate_health_pdf("Hacienda Villa Luz", self.finca_info, health)
        self._assert_valid_pdf(pdf)

    def test_generate_animal_cv_pdf(self):
        animal_data = {
            "id": 101,
            "record": "VL-CAMPION-2024",
            "breed": {"name": "Brahman Rojo"},
            "species": {"name": "Bovino"},
            "sex": "Macho",
            "birth_date": "2023-01-10",
            "age_in_months": 38,
            "weight": 720.0,
            "father_record": "VL-TORO-REY",
            "mother_record": "VL-VACA-REINA",
            "status": "Vivo",
        }
        kpis = {
            "frame_score": 6.8,
            "open_days": 45,
            "calving_interval": 385,
            "days_in_milk": 120,
            "withdrawal_remaining": 0,
            "is_withdrawing": False,
        }
        repro_history = [
            {
                "fecha": "2024-05-10",
                "evento": "Monta Natural",
                "toro/cria": "VL-TORO-REY",
                "detalle": "Servicio efectivo comprobado por ecografía",
            }
        ]
        pdf = generate_animal_cv_pdf("Hacienda Villa Luz", animal_data, kpis, repro_history)
        self._assert_valid_pdf(pdf)

    def test_generate_financial_statement_pdf(self):
        fin_data = {
            "balance": 18500000.0,
            "total_income": 25000000.0,
            "total_expenses": 6500000.0,
            "history": [
                {
                    "expense_date": "2026-02-01",
                    "category": "Venta de Leche",
                    "description": "Quincena lechera procesadora",
                    "is_income": True,
                    "amount": 12500000.0,
                },
                {
                    "expense_date": "2026-02-10",
                    "category": "Insumos Veterinarios",
                    "description": "Compra de sales mineralizadas y vacunas",
                    "is_income": False,
                    "amount": 3200000.0,
                },
            ],
        }
        pdf = generate_financial_statement_pdf("Hacienda Villa Luz", fin_data)
        self._assert_valid_pdf(pdf)

    def test_build_financial_pdf_helper(self):
        finca = DummyFinca("Hacienda Villa Luz")
        txs = [
            DummyTransaction(date(2026, 2, 1), "Ingreso", "Venta Ganado", 8500000.0, "Venta novillo gordo"),
            DummyTransaction(date(2026, 2, 15), "Gasto", "Nómina", 2000000.0, "Pago operario de campo"),
        ]
        pdf = _build_financial_pdf(finca, txs, 8500000.0, 2000000.0)
        self._assert_valid_pdf(pdf)

    def test_colombian_formatting_helpers(self):
        # 1234567.89 -> $ 1.234.567,89
        val_str = _fmt_money_co(1234567.89)
        self.assertIn("1.234.567,89", val_str)
        num_str = _fmt_num_co(5432.1, 1)
        self.assertEqual(num_str, "5.432,1")


if __name__ == "__main__":
    unittest.main()
