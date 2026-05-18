from app import create_app, db
import os

app = create_app('development')
with app.app_context():
    print("Creating all tables...")
    db.create_all()
    print("Tables created successfully.")
