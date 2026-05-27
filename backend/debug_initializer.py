from app import create_app, db
from app.models.user import User

app = create_app()
with app.app_context():
    ident = 11111111
    users = User.query.filter_by(identification=ident).all()
    print(f"Checking identification: {ident}")
    if not users:
        print("No user found with this identification.")
    for u in users:
        print(f"ID: {u.id}, Email: {u.email}, Identification: {u.identification}, Fullname: {u.fullname}")

    email = "instructor@finca.com"
    users_email = User.query.filter_by(email=email).all()
    print(f"\nChecking email: {email}")
    if not users_email:
        print("No user found with this email.")
    for u in users_email:
        print(f"ID: {u.id}, Email: {u.email}, Identification: {u.identification}, Fullname: {u.fullname}")
