from app import create_app, db
from app.models.tasks import Tasks
from app.models.operational_costs import OperationalCost

app = create_app()
with app.app_context():
    db.create_all()
    print("Tablas 'tasks' y 'operational_costs' creadas exitosamente.")
