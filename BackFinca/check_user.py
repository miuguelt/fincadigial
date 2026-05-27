from app import create_app, db
from app.models.user import User, ApprovalStatus

app = create_app()
with app.app_context():
    u = User.query.filter_by(identification=1098).first()
    if u:
        print(f"User: {u.fullname}")
        print(f"Status: {u.status}")
        print(f"Approval: {u.approval_status}")
        print(f"Finca ID: {u.finca_id}")

        # Reset password to ensure it matches
        u.set_password("Villaluz2024!")
        u.status = True
        u.approval_status = ApprovalStatus.Approved
        db.session.commit()
        print("Password reset and user activated.")
    else:
        print("User 1098 not found.")
