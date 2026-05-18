from app import create_app, db
from app.models.user import User, Role, ApprovalStatus
from app.models.finca import Finca, FarmType

def seed_admin():
    app = create_app()
    with app.app_context():
        # Asegurar que existe la finca
        finca = Finca.query.first()
        if not finca:
            finca = Finca.create(
                name="Villa Luz", 
                type=FarmType.Tradicional,
                department="Colombia"
            )
            print(f"Finca creada: {finca.id}")

        # Crear admin si no existe
        admin = User.query.filter_by(email="admin@villaluz.com").first()
        if not admin:
            # Usar el método create para manejar el hashing y la relación UserFinca
            admin = User.create(
                identification=12345678,
                fullname="Administrador Sistema",
                email="admin@villaluz.com",
                password="admin123",
                phone="3001234567",
                role=Role.Administrador,
                finca_id=finca.id,
                status=True,
                approval_status=ApprovalStatus.Approved
            )
            print(f"Admin creado: {admin.email}")
        else:
            print("Admin ya existe")

if __name__ == "__main__":
    seed_admin()
