from app import create_app
from app.extensions import db
from app.models import Transaction, TransactionType, TransactionCategory, SiniganRegistrations, Animals, Finca
from datetime import date, timedelta
from decimal import Decimal

app = create_app()
with app.app_context():
    finca_id = 4
    animals = Animals.query.filter_by(finca_id=finca_id).limit(20).all()
    
    if not animals:
        print("No hay animales en la finca 4 para asociar transacciones.")
    else:
        print(f"Poblando finanzas y registros SINIGAN para finca {finca_id}...")
        
        # 1. Transacciones (Finanzas)
        if Transaction.query.filter_by(finca_id=finca_id).count() == 0:
            txs = [
                {"type": TransactionType.Income, "cat": TransactionCategory.Milk, "amt": 5000000, "desc": "Venta semanal de leche (Hato A)"},
                {"type": TransactionType.Expense, "cat": TransactionCategory.Food, "amt": 1200000, "desc": "Compra de concentrado iniciación"},
                {"type": TransactionType.Expense, "cat": TransactionCategory.Medication, "amt": 450000, "desc": "Lote de desparasitantes"},
                {"type": TransactionType.Income, "cat": TransactionCategory.Animal, "amt": 2800000, "desc": "Venta de novillo #092"}
            ]
            for tx in txs:
                new_tx = Transaction(
                    finca_id=finca_id,
                    transaction_type=tx["type"],
                    category=tx["cat"],
                    amount=Decimal(tx["amt"]),
                    date=date.today() - timedelta(days=txs.index(tx)),
                    description=tx["desc"]
                )
                db.session.add(new_tx)
            print("Finanzas pobladas.")
        
        # 2. Registros SINIGAN (Trazabilidad)
        if SiniganRegistrations.query.filter_by(finca_id=finca_id).count() == 0:
            for i, animal in enumerate(animals[:10]):
                new_reg = SiniganRegistrations(
                    finca_id=finca_id,
                    animal_id=animal.id,
                    arete_sinigan=f"ICA-VILLA-{animal.record}-{i}",
                    fecha_registro=date.today() - timedelta(days=100),
                    predio_origen="Finca El Recuerdo",
                    guia_movilizacion=f"GUIA-{20260000 + i}",
                    notes="Registro inicial de trazabilidad nacional"
                )
                db.session.add(new_reg)
            print("Registros SINIGAN poblados.")
            
        db.session.commit()
        print("Operación completada con éxito.")
