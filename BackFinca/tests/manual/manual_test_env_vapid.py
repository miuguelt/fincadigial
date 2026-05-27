
import os
from dotenv import load_dotenv
load_dotenv()

public_key = os.environ.get('VAPID_PUBLIC_KEY')
private_key = os.environ.get('VAPID_PRIVATE_KEY')

print(f"Public Key: {public_key}")
print(f"Private Key: {private_key}")
