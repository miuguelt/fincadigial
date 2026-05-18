import os
import sys

# Path setup
sys.path.append(os.getcwd())

from app import create_app, db
from app.models.financial import Transaction
from app.models.milk_production import MilkProduction
from app.models.extended_summaries import FinancialSummary, MilkSummary
from app.models.finca import Finca

app = create_app('development')
with app.app_context():
    print("🚀 Creando tablas de resumen si no existen...")
    db.create_all()
    
    print("📊 Inicializando resúmenes extendidos...")
    fincas = Finca.query.all()
    
    for f in fincas:
        print(f"Buscando datos para Finca: {f.name} (ID: {f.id})")
        
        # 1. Finanzas
        f_summary = FinancialSummary.get_for_finca(f.id)
        incomes = db.session.query(db.func.sum(Transaction.amount)).filter_by(finca_id=f.id, transaction_type='Income').scalar() or 0
        expenses = db.session.query(db.func.sum(Transaction.amount)).filter_by(finca_id=f.id, transaction_type='Expense').scalar() or 0
        
        f_summary.total_income = incomes
        f_summary.total_expense = expenses
        f_summary.balance = incomes - expenses
        
        # 2. Producción
        m_summary = MilkSummary.get_for_finca(f.id)
        total_l = db.session.query(db.func.sum(MilkProduction.liters)).filter_by(finca_id=f.id).scalar() or 0
        total_e = db.session.query(db.func.count(MilkProduction.id)).filter_by(finca_id=f.id).scalar() or 0
        
        m_summary.total_liters = total_l
        m_summary.total_entries = total_e
        m_summary.avg_liters_per_animal = total_l / total_e if total_e > 0 else 0
        
        print(f"  - Finanzas: Balance {f_summary.balance}")
        print(f"  - Leche: Total {m_summary.total_liters}L")
        
    db.session.commit()
    print("✅ Inicialización completada.")
