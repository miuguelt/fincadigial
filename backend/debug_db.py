import os
import sys
from dotenv import load_dotenv

# Add app to path
sys.path.append(os.getcwd())

load_dotenv()

try:
    from app import create_app, db
    from app.models.user import User
    
    app = create_app()
    with app.app_context():
        # Test DB
        user_count = User.query.count()
        print(f"✅ DB Connection OK. User count: {user_count}")
        
        # Test first user
        u = User.query.first()
        if u:
            print(f"✅ First user found: {u.identification} ({u.role})")
        else:
            print("⚠️ No users found in database.")
            
except Exception as e:
    print(f"❌ Error during health check: {e}")
    import traceback
    traceback.print_exc()
