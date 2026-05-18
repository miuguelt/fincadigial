import os
import redis
from dotenv import load_dotenv

load_dotenv()

urls = [
    'redis://127.0.0.1:6380/0',
    'redis://localhost:6380/0',
    'redis://192.168.1.101:6380/0',
    'redis://127.0.0.1:6379/0' # Just in case it conflict with devbrain but works
]

for redis_url in urls:
    print(f"Connecting to Redis at {redis_url}...")
    try:
        r = redis.from_url(redis_url, socket_connect_timeout=2)
        r.ping()
        print(f"SUCCESS: Connected to Redis at {redis_url}!")
        break
    except Exception as e:
        print(f"FAILED for {redis_url}: {e}")
