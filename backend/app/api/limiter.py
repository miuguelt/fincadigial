import logging
import flask

def apply_rate_limit_exemptions(app, api, api_bp, limiter, namespaces_to_exempt):
    logger = logging.getLogger(__name__)
    if not limiter:
        return

    def _exempt_endpoint(endpoint_name: str):
        try:
            vf = app.view_functions.get(endpoint_name)
            if not vf or getattr(vf, "_rate_limit_exempted", False):
                return
            app.view_functions[endpoint_name] = limiter.exempt(vf)
            app.view_functions[endpoint_name]._rate_limit_exempted = True
        except Exception:
            logger.exception("No se pudo eximir rate limit para endpoint %s", endpoint_name)

    def _exempt_ns(ns):
        try:
            base = f"{api_bp.name}.{getattr(ns, 'name', '')}"
            if base.endswith(".") or base == api_bp.name + ".":
                return
            _exempt_endpoint(f"{base}_model_list_resource")
            _exempt_endpoint(f"{base}_model_detail_resource")
            _exempt_endpoint(f"{base}_model_stats_resource")
        except Exception:
            logger.exception('No se pudo eximir rate limit para namespace')

    for ns in namespaces_to_exempt:
        _exempt_ns(ns)
