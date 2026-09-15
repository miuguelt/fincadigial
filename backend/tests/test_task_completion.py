"""Criterios de trazabilidad entre una tarea y su registro de cumplimiento."""

from app.models.activity_log import ActivityLog
from app.models.tasks import TaskStatus, Tasks


BASE = "/api/v1"


def _data(response):
    body = response.get_json()
    return body.get("data", body)


def _create_task(client, headers, title="Revisar cerca perimetral"):
    response = client.post(
        f"{BASE}/tasks",
        json={"title": title, "status": "Pendiente"},
        headers=headers,
    )
    assert response.status_code in (200, 201), response.get_json()
    return _data(response)["id"]


def test_completar_tarea_crea_un_registro_ligado_y_un_evento_de_auditoria(
    app, client, token_for
):
    """Given/When/Then: completar persiste la relación y la evidencia."""
    from app.models.task_completion import TaskCompletionRecord

    headers = token_for("Administrador")
    task_id = _create_task(client, headers)

    response = client.post(
        f"{BASE}/tasks/{task_id}/complete",
        json={"notes": "Se verificó el cierre del lindero norte."},
        headers=headers,
    )

    assert response.status_code == 200, response.get_json()
    completion = _data(response)
    assert completion["task_id"] == task_id
    assert completion["notes"] == "Se verificó el cierre del lindero norte."

    detail = client.get(
        f"{BASE}/tasks/{task_id}/completion", headers=headers
    )
    assert detail.status_code == 200, detail.get_json()
    assert _data(detail)["id"] == completion["id"]

    listing = client.get(
        f"{BASE}/tasks?cache_bust=task-completion-test", headers=headers
    )
    assert listing.status_code == 200, listing.get_json()
    listed_task = next(item for item in _data(listing) if item["id"] == task_id)
    assert listed_task["completion_record_id"] == completion["id"]

    with app.app_context():
        task = Tasks.query.get(task_id)
        record = TaskCompletionRecord.query.filter_by(task_id=task_id).one()
        events = ActivityLog.query.filter_by(
            entity="tasks", entity_id=task_id, action="complete"
        ).all()

        assert task.status == TaskStatus.COMPLETED
        assert record.id == completion["id"]
        assert record.completed_by is not None
        assert record.completed_at is not None
        assert len(events) == 1
        assert events[0].relations["completion_record_id"] == record.id


def test_completar_tarea_es_idempotente_y_reutiliza_el_registro(
    app, client, token_for
):
    """Given/When/Then: repetir la acción no duplica el registro."""
    from app.models.task_completion import TaskCompletionRecord

    headers = token_for("Administrador")
    task_id = _create_task(client, headers, "Aplicar plan de alimentación")

    first = client.post(
        f"{BASE}/tasks/{task_id}/complete",
        json={"notes": "Primera ejecución."},
        headers=headers,
    )
    second = client.post(
        f"{BASE}/tasks/{task_id}/complete",
        json={"notes": "Verificación final."},
        headers=headers,
    )

    assert first.status_code == 200, first.get_json()
    assert second.status_code == 200, second.get_json()
    assert _data(second)["id"] == _data(first)["id"]

    with app.app_context():
        assert TaskCompletionRecord.query.filter_by(task_id=task_id).count() == 1
        assert TaskCompletionRecord.query.filter_by(task_id=task_id).one().notes == (
            "Verificación final."
        )
        assert ActivityLog.query.filter_by(
            entity="tasks", entity_id=task_id, action="complete"
        ).count() == 1


def test_no_se_puede_completar_una_tarea_cancelada(
    app, client, token_for
):
    """Given/When/Then: una tarea cancelada no puede generar cumplimiento."""
    from app.models.task_completion import TaskCompletionRecord

    headers = token_for("Administrador")
    task_id = _create_task(client, headers, "Cerrar orden de compra")
    cancelled = client.patch(
        f"{BASE}/tasks/{task_id}",
        json={"status": "Cancelada"},
        headers=headers,
    )
    assert cancelled.status_code == 200, cancelled.get_json()

    response = client.post(
        f"{BASE}/tasks/{task_id}/complete", json={}, headers=headers
    )

    assert response.status_code == 409, response.get_json()
    with app.app_context():
        assert TaskCompletionRecord.query.filter_by(task_id=task_id).count() == 0


def test_patch_tampoco_puede_completar_una_tarea_cancelada(
    app, client, token_for
):
    """El CRUD genérico conserva la misma regla de negocio del comando."""
    from app.models.task_completion import TaskCompletionRecord

    headers = token_for("Administrador")
    task_id = _create_task(client, headers, "Revisar inventario de herramientas")
    assert client.patch(
        f"{BASE}/tasks/{task_id}",
        json={"status": "Cancelada"},
        headers=headers,
    ).status_code == 200

    response = client.patch(
        f"{BASE}/tasks/{task_id}",
        json={"status": "Completada"},
        headers=headers,
    )

    assert response.status_code == 409, response.get_json()
    with app.app_context():
        assert TaskCompletionRecord.query.filter_by(task_id=task_id).count() == 0


def test_crear_tarea_ya_completada_tambien_genera_evidencia(app, client, token_for):
    """La regla aplica tanto al alta como al cambio de estado."""
    from app.models.task_completion import TaskCompletionRecord

    headers = token_for("Administrador")
    response = client.post(
        f"{BASE}/tasks",
        json={"title": "Tarea histórica completada", "status": "Completada"},
        headers=headers,
    )

    assert response.status_code in (200, 201), response.get_json()
    task_id = _data(response)["id"]
    with app.app_context():
        record = TaskCompletionRecord.query.filter_by(task_id=task_id).one()
        assert record.completed_at is not None
