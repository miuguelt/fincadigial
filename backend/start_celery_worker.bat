@echo off
set REDIS_URL=redis://127.0.0.1:6380/0
set CELERY_BROKER_URL=redis://127.0.0.1:6380/1
set DB_HOST=127.0.0.1
set DB_PORT=5434
set DB_NAME=finca_db
set DB_USER=villaluz
start /b "" "C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz\backend\venv_win\Scripts\python.exe" -m celery -A celery_worker.celery worker --loglevel=info --concurrency=2 > "C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz\logs\celery_worker.log" 2> "C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz\logs\celery_worker_error.log"
