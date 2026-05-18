from app import create_app, db
from app.models.user import User

app = create_app()
with app.app_context():
    from app.models.finca import Finca
    fincas = Finca.query.all()
    print(f"\nTotal fincas: {len(fincas)}")
    for f in fincas:
        print(f"ID: {f.id}, Name: {f.name}, Type: {f.type}")

    users = User.query.all()
    print(f"Total users: {len(users)}")
    for u in users:
        print(f"ID: {u.id}, Ident: {u.identification}, Name: {u.fullname}, Role: {u.role}, Status: {u.status}, Approval: {u.approval_status}")
