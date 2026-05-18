import os
import sys
import json

# Add backend directory to path
sys.path.append(os.path.abspath('backend'))

from app import create_app, db
from app.models.user import User

app = create_app()

with app.app_context():
    # Find user 1098
    user = User.query.filter_by(identification=1098).first()
    if not user:
        print("User 1098 not found, using first user instead.")
        user = User.query.first()
        
    if not user:
        print("No users found in database.")
        sys.exit(1)
        
    print(f"Testing to_namespace_dict for user: {user.fullname} (ID: {user.id}, Ident: {user.identification})")
    try:
        data = user.to_namespace_dict()
        print("Success! user.to_namespace_dict() worked.")
        print(json.dumps(data, indent=2, default=str))
    except Exception as e:
        print(f"Failed! Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

with app.test_client() as client:
    print("\nTesting /api/v1/auth/me via test_client (manual mock login)...")
    from flask_jwt_extended import create_access_token
    with app.app_context():
        # Get the same user as above
        user = User.query.filter_by(identification=1098).first() or User.query.first()
        access_token = create_access_token(identity=str(user.id), additional_claims={
            'id': user.id,
            'role': user.role.value,
            'finca_id': user.finca_id
        })
    
    response = client.get('/api/v1/auth/me', headers={
        'Authorization': f'Bearer {access_token}'
    })
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.get_data(as_text=True)}")
    if response.status_code != 200:
        sys.exit(1)
