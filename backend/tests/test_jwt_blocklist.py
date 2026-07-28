import pytest
import flask
import time
from datetime import datetime, UTC, timedelta
from unittest.mock import MagicMock, patch
from app.utils.jwt_handlers import configure_jwt_handlers
from app.utils.token_blocklist import (
    mark_token_revoked,
    is_token_revoked,
    _cache_timeout_for,
    _cleanup_fallback,
    _fallback_blocklist
)

class MockJWTManager:
    def __init__(self):
        self.expired_fn = None
        self.invalid_fn = None
        self.unauthorized_fn = None
        self.blocklist_fn = None
        self.revoked_fn = None
        self.claims_fn = None

    def expired_token_loader(self, fn):
        self.expired_fn = fn
        return fn

    def invalid_token_loader(self, fn):
        self.invalid_fn = fn
        return fn

    def unauthorized_loader(self, fn):
        self.unauthorized_fn = fn
        return fn

    def token_in_blocklist_loader(self, fn):
        self.blocklist_fn = fn
        return fn

    def revoked_token_loader(self, fn):
        self.revoked_fn = fn
        return fn

    def additional_claims_loader(self, fn):
        self.claims_fn = fn
        return fn

@pytest.mark.unit
@pytest.mark.critical
def test_jwt_handlers_callbacks(app):
    jwt = MockJWTManager()
    configure_jwt_handlers(jwt)

    # 1. expired_token_callback (requires app context due to flask.jsonify / current_app)
    with app.app_context():
        # expired 60 seconds ago
        payload = {
            'exp': int(time.time()) - 60,
            'type': 'access'
        }
        with app.test_request_context():
            resp = jwt.expired_fn({}, payload)
            assert resp.status_code == 401
            assert resp.headers['Cache-Control'] == 'no-store'
            data = resp.get_json()
            assert data['success'] is False
            assert data['error']['code'] == 'TOKEN_EXPIRED'
            assert data['error']['details']['token_type'] == 'access'
            assert data['error']['details']['client_action'] == 'ATTEMPT_REFRESH'

        # refresh token expired
        payload_refresh = {
            'exp': int(time.time()) - 60,
            'type': 'refresh'
        }
        with app.test_request_context():
            resp_ref = jwt.expired_fn({}, payload_refresh)
            assert resp_ref.status_code == 401
            data_ref = resp_ref.get_json()
            assert data_ref['error']['details']['token_type'] == 'refresh'
            assert data_ref['error']['details']['client_action'] == 'CLEAR_AUTH_AND_RELOGIN'

    # 2. invalid_token_callback
    res, status = jwt.invalid_fn("Token structure invalid")
    assert status == 401
    assert res['success'] is False
    assert res['error']['code'] == 'INVALID_TOKEN'

    # 3. unauthorized_callback (CSRF error)
    res, status = jwt.unauthorized_fn("Missing CSRF token")
    assert status == 401
    assert res['error']['code'] == 'CSRF_ERROR'

    # unauthorized_callback (Missing Token)
    res, status = jwt.unauthorized_fn("Missing authorization header")
    assert status == 401
    assert res['error']['code'] == 'MISSING_TOKEN'

    # 4. token_in_blocklist_loader
    # Setup mock for is_token_revoked
    with patch('app.utils.jwt_handlers.is_token_revoked', return_value=True):
        assert jwt.blocklist_fn({}, {"jti": "some-jti"}) is True

    # Check exception handling
    with patch('app.utils.jwt_handlers.is_token_revoked', side_effect=Exception("Cache error")):
        assert jwt.blocklist_fn({}, {"jti": "some-jti"}) is False

    # 5. revoked_token_callback
    with app.app_context():
        with app.test_request_context():
            resp = jwt.revoked_fn({}, {"type": "access", "sub": "123"})
            assert resp.status_code == 401
            data = resp.get_json()
            assert data['success'] is False
            assert data['error']['code'] == 'TOKEN_REVOKED'

    # 6. additional_claims_loader
    with app.app_context():
        claims = jwt.claims_fn("123")
        assert 'server_time_utc' in claims
        assert claims['server_env'] == app.config.get('CONFIG_NAME')


@pytest.mark.unit
@pytest.mark.critical
def test_token_blocklist_ttl(app):
    # 1. TTL using 'exp' claim
    future_time = int(time.time()) + 120
    token = {"jti": "t1", "exp": future_time}
    assert 115 <= _cache_timeout_for(token) <= 120

    # 2. TTL fallback when exp is missing, using app config
    with app.app_context():
        app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
        token_no_exp = {"jti": "t2", "type": "access"}
        assert _cache_timeout_for(token_no_exp) == 900

        app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)
        token_refresh = {"jti": "t3", "type": "refresh"}
        assert _cache_timeout_for(token_refresh) == 7 * 24 * 3600

    # 3. Fallback when exception or missing details
    assert _cache_timeout_for(None) == 3600


@pytest.mark.unit
@pytest.mark.critical
def test_token_blocklist_operations():
    # Reset fallback blocklist
    _fallback_blocklist.clear()

    # Invalid tokens
    assert mark_token_revoked(None) is False
    assert mark_token_revoked("not-a-dict") is False
    assert mark_token_revoked({"no-jti": "val"}) is False

    # Mark token revoked (without cache, using fallback blocklist in memory)
    token = {"jti": "test-jti-123", "exp": int(time.time()) + 10}
    with patch('app.utils.token_blocklist._get_cache', return_value=None):
        assert mark_token_revoked(token) is True
        assert is_token_revoked(token) is True

        # Non-revoked token
        assert is_token_revoked({"jti": "other-jti"}) is False

        # Token with no jti
        assert is_token_revoked({}) is False

    # Mark token revoked (with cache success)
    mock_cache = MagicMock()
    with patch('app.utils.token_blocklist._get_cache', return_value=mock_cache):
        assert mark_token_revoked(token) is True
        mock_cache.set.assert_called_once()
        
        # Verify is_token_revoked checks cache
        mock_cache.get.return_value = True
        assert is_token_revoked(token) is True
        mock_cache.get.assert_called_with("jwt:block:test-jti-123")

    # Mark token revoked (with cache exception)
    mock_cache_fail = MagicMock()
    mock_cache_fail.set.side_effect = Exception("Redis error")
    with patch('app.utils.token_blocklist._get_cache', return_value=mock_cache_fail):
        assert mark_token_revoked(token) is False

    # Verify is_token_revoked handles exception: with the cache unreachable we
    # cannot prove the token is still valid, so it must be treated as revoked.
    mock_cache_fail.get.side_effect = Exception("Redis error")
    with patch('app.utils.token_blocklist._get_cache', return_value=mock_cache_fail):
        assert is_token_revoked(token) is True


@pytest.mark.unit
@pytest.mark.critical
def test_token_blocklist_cleanup():
    # Insert expired token in fallback blocklist
    past_time = time.time() - 10
    future_time = time.time() + 60
    
    _fallback_blocklist.clear()
    _fallback_blocklist["expired-jti"] = past_time
    _fallback_blocklist["active-jti"] = future_time

    _cleanup_fallback()

    assert "expired-jti" not in _fallback_blocklist
    assert "active-jti" in _fallback_blocklist
