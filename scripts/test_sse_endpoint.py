#!/usr/bin/env python3
"""Prueba del endpoint SSE /analytics/live/stream"""

import requests
import json
import sys

from test_credentials import get_role_credentials

BASE_URL = "http://localhost:8181/api/v1"


def login():
    """Login y obtener token"""
    identifier, password = get_role_credentials("Administrador")
    resp = requests.post(
        f"{BASE_URL}/auth/login", json={"identifier": identifier, "password": password}
    )
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success"):
            return data["data"]["access_token"]
    return None


def test_sse_endpoint(token):
    """Prueba el endpoint SSE"""
    headers = {"Accept": "text/event-stream", "Authorization": f"Bearer {token}"}

    print(f"Conectando a {BASE_URL}/analytics/live/stream...")

    try:
        # Usar streaming para SSE
        resp = requests.get(
            f"{BASE_URL}/analytics/live/stream",
            headers=headers,
            stream=True,
            timeout=35,  # Timeout mayor que el intervalo de 30s
        )

        if resp.status_code == 200:
            print(f"✓ Conexión SSE establecida (Status: {resp.status_code})")
            print(f"  Content-Type: {resp.headers.get('Content-Type')}")

            # Leer algunos eventos
            event_count = 0
            for line in resp.iter_lines():
                if line:
                    line_str = line.decode("utf-8")
                    if line_str.startswith("data:"):
                        data_str = line_str[5:].strip()
                        try:
                            data = json.loads(data_str)
                            print(f"\n✓ Evento recibido #{event_count + 1}:")
                            print(f"  Timestamp: {data.get('timestamp')}")
                            kpis = data.get("kpis", {})
                            for k, v in kpis.items():
                                print(f"  - {k}: {v}")
                            event_count += 1
                            if event_count >= 1:  # Solo mostrar 1 evento
                                break
                        except json.JSONDecodeError:
                            print(f"  Evento (no JSON): {data_str[:100]}")

            if event_count > 0:
                print(f"\n✓ SSE funciona correctamente ({event_count} evento(s) recibido(s))")
                return True
            else:
                print("✗ No se recibieron eventos de datos")
                return False
        else:
            print(f"✗ Error: Status {resp.status_code}")
            print(f"  Respuesta: {resp.text[:200]}")
            return False

    except requests.exceptions.Timeout:
        print("✗ Timeout esperando eventos SSE")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


if __name__ == "__main__":
    token = login()
    if not token:
        print("✗ Login falló")
        sys.exit(1)

    print("✓ Login exitoso\n")
    success = test_sse_endpoint(token)
    sys.exit(0 if success else 1)
