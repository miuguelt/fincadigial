import os
import sys

backend_path = os.path.join(os.getcwd(), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


def run_recalculation():
    from app import create_app
    from app.models.finca import Finca
    from app.models.extended_summaries import FinancialSummary, MilkSummary
    from app.models.livestock_summary import LivestockSummary

    app = create_app("development")
    with app.app_context():
        fincas = Finca.query.all()
        for finca in fincas:
            print(f"🔄 Recalculando resúmenes para Finca ID {finca.id}...")

            f_summary = FinancialSummary.get_for_finca(finca.id)
            f_summary.recalculate()

            m_summary = MilkSummary.get_for_finca(finca.id)
            m_summary.recalculate()

            try:
                l_summary = LivestockSummary.get_for_finca(finca.id)
                l_summary.recalculate()
            except Exception as e:
                print(f"⚠️ Error recalculando ganado (ignorado): {e}")

        print("✅ Resúmenes recalculados exitosamente.")


if __name__ == "__main__":
    run_recalculation()
