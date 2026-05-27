
from dotenv import load_dotenv
load_dotenv()

from app.utils.vapid_config import get_vapid_keys

keys = get_vapid_keys()
print(f"Keys: {keys}")
