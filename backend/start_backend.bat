@echo off
set FLASK_ENV=development
set FLASK_APP=wsgi.py
set PORT=8092
set DB_HOST=127.0.0.1
set DB_PORT=5434
set DB_NAME=finca_db
set DB_USER=villaluz
set REDIS_URL=redis://127.0.0.1:6380/0
set CELERY_BROKER_URL=redis://127.0.0.1:6380/1
set CORS_ORIGINS=http://localhost:3005,http://127.0.0.1:3005
start /b "" "C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz\backend\venv_win\Scripts\python.exe" wsgi.py > "C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz\logs\backend.log" 2> "C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz\logs\backend_error.log"
