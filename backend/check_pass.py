from app import create_app, db
from app.models.user import User
from werkzeug.security import check_password_hash

app = create_app('development')
with app.app_context():
    user = User.query.filter_by(identification=1098).first()
    if user:
        print(f"User found: {user.fullname}")
        print(f"Role: {user.role}")
        print(f"Status: {user.status}")
        print(f"Approval: {user.approval_status}")
        print(f"Stored hash: {user.password}")
        is_match = user.check_password('Villaluz2024!')
        print(f"Check password 'Villaluz2024!': {is_match}")
        
        # Probar directamente con werkzeug
        is_match_wk = check_password_hash(user.password, 'Villaluz2024!')
        print(f"Werkzeug check: {is_match_wk}")
    else:
        print("User 1098 not found")
