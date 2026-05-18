import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

host = os.getenv('DB_HOST', '127.0.0.1')
port = int(os.getenv('DB_PORT', '3307'))
user = os.getenv('DB_USER', 'villaluz')
password = os.getenv('DB_PASSWORD', 'villaluz_pass')
database = os.getenv('DB_NAME', 'finca_db')

print(f"Connecting to {host}:{port} as {user}...")

try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        connect_timeout=5
    )
    print("SUCCESS: Connected to database!")
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
