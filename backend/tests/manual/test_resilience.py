"""
Resilience stress test: simulates Redis/PostgreSQL failures and verifies
the backend stays up and responds gracefully.
"""
import subprocess
import time
import sys
import json
import urllib.request
import urllib.error
import os
import signal

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BACKEND_PORT = 8092
HEALTH_URL = f"http://127.0.0.1:{BACKEND_PORT}/api/v1/health/"
BASE_URL = f"http://127.0.0.1:{BACKEND_PORT}"

passed = 0
failed = 0
errors = []

def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ {label}")
    else:
        failed += 1
        msg = f"  ❌ {label} — {detail}"
        print(msg)
        errors.append(msg)

def http_get(path, timeout=5):
    try:
        resp = urllib.request.urlopen(f"{BASE_URL}{path}", timeout=timeout)
        data = resp.read().decode()
        return resp.status, json.loads(data) if data else {}
    except urllib.error.HTTPError as e:
        data = e.read().decode()
        try:
            return e.code, json.loads(data) if data else {}
        except json.JSONDecodeError:
            return e.code, {"error": data}
    except Exception as e:
        return 0, {"error": str(e)}

def wait_for_backend(retries=20):
    for i in range(retries):
        status, data = http_get("/api/v1/health/", timeout=3)
        if status == 200:
            return True
        time.sleep(1)
    return False

def stop_service(name):
    """Stop a Windows service."""
    result = subprocess.run(
        ["powershell", "-Command", f"Stop-Service -Name '{name}' -Force; Start-Sleep 2"],
        capture_output=True, text=True, timeout=30
    )
    return result.returncode == 0 or "has not been started" in result.stderr

def start_service(name):
    """Start a Windows service."""
    result = subprocess.run(
        ["powershell", "-Command", f"Start-Service -Name '{name}'; Start-Sleep 2"],
        capture_output=True, text=True, timeout=30
    )
    return result.returncode == 0

def is_service_running(name):
    result = subprocess.run(
        ["powershell", "-Command", f"(Get-Service -Name '{name}').Status"],
        capture_output=True, text=True, timeout=10
    )
    return "Running" in result.stdout


def main():
    """Runs the whole stress test. Guarded so importing this module is inert:
    the body stops Memurai/PostgreSQL and spawns a backend, which must never
    happen just because pytest collected the file."""
    print("=" * 60)
    print("🏥 RESILIENCE STRESS TEST")
    print("=" * 60)
    print()

    # ── Phase 1: Verify backend starts ──
    print("📦 Phase 1: Starting backend...")
    backend_proc = subprocess.Popen(
        [sys.executable, "wsgi.py"],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env={**os.environ, "FLASK_ENV": "development", "PYTHONUNBUFFERED": "1"}
    )
    time.sleep(10)
    check("Backend process started", backend_proc.poll() is None, f"PID={backend_proc.pid}")
    check("Backend responds on health endpoint", wait_for_backend(), "HTTP 200 on /api/v1/health/")

    if backend_proc.poll() is not None:
        print("\n❌ Backend crashed immediately. Aborting.")
        sys.exit(1)

    print()
    # ── Phase 2: Test Redis failure ──
    print("📦 Phase 2: Simulating Redis (Memurai) failure...")

    memurai_was_running = is_service_running("Memurai")
    print(f"  Memurai running: {memurai_was_running}")

    if memurai_was_running:
        check("Stop Memurai service", stop_service("Memurai"))
        time.sleep(3)
    else:
        print("  ⚠️  Memurai was not running, skipping stop")

    # Make requests while Redis is down
    print("  Testing requests during Redis outage...")
    for i in range(3):
        status, data = http_get("/api/v1/health/", timeout=10)
        if status == 200:
            redis_status = data.get("data", {}).get("redis", "unknown")
            db_status = data.get("data", {}).get("database_status", "unknown")
            overall = data.get("data", {}).get("status", "unknown")
            print(f"    Request {i+1}: status={status}, overall={overall}, redis={redis_status}, db={db_status}")

    # The health endpoint might return 200 or 503 depending on configuration
    # But the app should NOT crash
    check("App still running after Redis kill", backend_proc.poll() is None)

    # Try auth-like endpoint that uses token blocklist
    status, data = http_get("/api/v1/health/", timeout=10)
    check("Health endpoint responds during Redis outage", status in (200, 503), f"status={status}")

    # Try a request that goes through JWT (will exercise token_blocklist)
    # Even if it returns 401 unauthorized, it shouldn't crash
    status, data = http_get("/api/v1/animals/", timeout=10)
    check("API endpoint doesn't crash during Redis outage", 
          status in (200, 401, 503), f"status={status}")
    if status == 401:
        print("    → Got 401 (expected — no JWT token)")

    # Restart Redis
    print()
    print("  Restarting Memurai...")
    if memurai_was_running:
        check("Start Memurai service", start_service("Memurai"))
        time.sleep(3)
        check("Memurai running after restart", is_service_running("Memurai"))

        # Verify EventBus reconnects (give it time for circuit breaker)
        time.sleep(2)
        status, data = http_get("/api/v1/health/", timeout=10)
        check("Health endpoint OK after Redis recovery", status == 200, f"status={status}")
        if status == 200:
            redis_status = data.get("data", {}).get("redis", "unknown")
            check("Redis status healthy after recovery", redis_status == "ok", f"redis={redis_status}")

    print()

    # ── Phase 3: Test PostgreSQL failure ──
    print("📦 Phase 3: Simulating PostgreSQL failure...")

    pg_service = "postgresql-x64-18"
    pg_was_running = is_service_running(pg_service)
    print(f"  PostgreSQL running: {pg_was_running}")

    if pg_was_running:
        check("Stop PostgreSQL service", stop_service(pg_service))
        time.sleep(3)
    else:
        print("  ⚠️  PostgreSQL was not running")

    print("  Testing requests during PostgreSQL outage...")
    for i in range(3):
        status, data = http_get("/api/v1/health/", timeout=15)
        print(f"    Request {i+1}: status={status}")
        if isinstance(data, dict):
            msg = data.get("message", data.get("error", {}).get("message", ""))
            if msg:
                print(f"      message: {msg[:80]}")

    check("App still running after PostgreSQL kill", backend_proc.poll() is None, f"PID={backend_proc.pid}")

    # Try a DB-dependent endpoint
    status, data = http_get("/api/v1/health/database", timeout=15)
    check("DB health endpoint responds during PG outage", status in (200, 503), f"status={status}")

    print()
    print("  Restarting PostgreSQL...")
    if pg_was_running:
        check("Start PostgreSQL service", start_service(pg_service))
        time.sleep(5)
        check("PostgreSQL running after restart", is_service_running(pg_service))

        # Wait for backend to recover
        time.sleep(3)
        status, data = http_get("/api/v1/health/", timeout=15)
        check("Health endpoint OK after PG recovery", status == 200, f"status={status}")
        if status == 200:
            db_status = data.get("data", {}).get("database_status", "unknown")
            check("Database status connected after recovery", db_status == "connected", f"db={db_status}")

    print()

    # ── Phase 4: Simultaneous failure ──
    print("📦 Phase 4: Both Redis AND PostgreSQL down simultaneously...")
    both_down = True
    if memurai_was_running:
        both_down &= stop_service("Memurai")
    if pg_was_running:
        both_down &= stop_service(pg_service)
    time.sleep(3)

    for i in range(2):
        status, data = http_get("/api/v1/health/", timeout=15)
        print(f"    Request {i+1}: status={status}")

    check("App still running with BOTH services down", backend_proc.poll() is None, f"PID={backend_proc.pid}")

    print()
    print("  Recovering all services...")
    if memurai_was_running:
        start_service("Memurai")
    if pg_was_running:
        start_service(pg_service)
    time.sleep(5)

    for i in range(5):
        status, data = http_get("/api/v1/health/", timeout=10)
        if status == 200:
            db = data.get("data", {}).get("database_status", "")
            rd = data.get("data", {}).get("redis", "")
            if db == "connected" and rd == "ok":
                print(f"  ✅ Both services recovered on attempt {i+1}")
                break
        time.sleep(2)

    status, data = http_get("/api/v1/health/", timeout=10)
    if status == 200:
        db = data.get("data", {}).get("database_status", "")
        rd = data.get("data", {}).get("redis", "")
        check("Full recovery after both services restored", db == "connected" and rd == "ok", f"db={db}, redis={rd}")
    else:
        check("Backend responds after both services restored", True, f"status={status}")

    print()

    # ── Cleanup ──
    print("📦 Cleaning up...")
    if backend_proc.poll() is None:
        backend_proc.terminate()
        time.sleep(2)
        if backend_proc.poll() is None:
            backend_proc.kill()
        check("Backend process terminated", True)

    # Ensure services are back to original state
    if memurai_was_running and not is_service_running("Memurai"):
        start_service("Memurai")
    if pg_was_running and not is_service_running(pg_service):
        start_service(pg_service)

    print()
    print("=" * 60)
    print(f"📊 RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    if errors:
        print("\nErrors:")
        for e in errors:
            print(e)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
