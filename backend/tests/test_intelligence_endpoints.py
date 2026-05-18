import pytest
from unittest.mock import patch, MagicMock
from datetime import date, timedelta

@pytest.fixture
def auth_headers(token_for):
    """Retorna el header de autorización para un administrador"""
    return token_for("Administrador")

def test_ai_insights_general(client, auth_headers):
    """Prueba el endpoint de ai-insights (compatibilidad frontend)"""
    with patch('app.services.cortex_service.CortexService.call_claude') as mock_claude:
        mock_claude.return_value = {
            'text': 'Análisis de prueba',
            'model': 'claude-3-haiku',
            'usage': {'input_tokens': 100, 'output_tokens': 50}
        }
        
        response = client.get(
            '/api/v1/analytics/ai-insights',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'insight' in data['data']

def test_weight_prediction(client, auth_headers):
    """Prueba la predicción de peso"""
    with patch('app.services.analytics.prediction_service.PredictionService.predict_animal_weight') as mock_predict:
        mock_predict.return_value = {'predicted_weight': 460.5}
        
        response = client.get(
            '/api/v1/analytics/predictions/weight/1',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['predicted_weight'] == 460.5

def test_run_predictive_analysis(client, auth_headers):
    """Prueba el disparo del análisis predictivo (legacy path)"""
    with patch('app.tasks.predictive_tasks.run_finca_predictive_analysis.delay') as mock_task:
        mock_task.return_value = MagicMock(id='test-task-id')
        
        response = client.post(
            '/api/v1/analytics/predictive/run',
            headers=auth_headers
        )
        
        assert response.status_code == 202

def test_intelligence_summary(client, auth_headers):
    """Prueba el resumen de inteligencia (legacy path)"""
    with patch('app.services.predictive_engine_service.PredictiveEngineService.get_finca_insights_summary') as mock_summary:
        mock_summary.return_value = "Resumen ok"
        
        response = client.get(
            '/api/v1/analytics/predictive/insights',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['insight'] == "Resumen ok"
