import os
import json
import logging
from datetime import datetime, UTC
from flask_restx import Namespace, Resource
from app.utils.response_handler import APIResponse

logger = logging.getLogger(__name__)

monitor_ns = Namespace(
    "system-monitor", description="Monitoreo del sistema y ecosistema", path="/system"
)

LOG_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "logs")
)
DOCS_DIRS = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs")),
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend", "docs")
    ),
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "docs")
    ),
]


@monitor_ns.route("/logs")
class LogList(Resource):
    def get(self):
        logs = []
        if not os.path.isdir(LOG_DIR):
            return APIResponse.success(data={"logs": [], "total": 0})
        for f in sorted(os.listdir(LOG_DIR), reverse=True):
            fp = os.path.join(LOG_DIR, f)
            if os.path.isfile(fp):
                size_kb = round(os.path.getsize(fp) / 1024, 1)
                mtime = datetime.fromtimestamp(os.path.getmtime(fp), tz=UTC).isoformat()
                ext = os.path.splitext(f)[1].lower()
                category = (
                    "json" if ext == ".json" else "log" if ext == ".log" else "other"
                )
                logs.append(
                    {
                        "name": f,
                        "size_kb": size_kb,
                        "modified": mtime,
                        "category": category,
                    }
                )
        return APIResponse.success(data={"logs": logs, "total": len(logs)})


@monitor_ns.route("/logs/<path:filename>")
class LogDetail(Resource):
    def get(self, filename):
        safe = os.path.basename(filename.replace("\\", "/"))
        fp = os.path.join(LOG_DIR, safe)
        if not os.path.isfile(fp):
            return APIResponse.error(message="Log file not found", status_code=404)
        try:
            max_bytes = 1024 * 512
            size = os.path.getsize(fp)
            with open(fp, encoding="utf-8", errors="replace") as f:
                if size > max_bytes:
                    f.seek(size - max_bytes)
                    f.readline()
                content = f.read()
            return APIResponse.success(
                data={
                    "name": safe,
                    "size_kb": round(size / 1024, 1),
                    "truncated": size > max_bytes,
                    "content": content,
                }
            )
        except Exception as e:
            return APIResponse.error(message=str(e), status_code=500)


@monitor_ns.route("/logs/<path:filename>/tail")
class LogTail(Resource):
    def get(self, filename):
        safe = os.path.basename(filename.replace("\\", "/"))
        fp = os.path.join(LOG_DIR, safe)
        if not os.path.isfile(fp):
            return APIResponse.error(message="Log file not found", status_code=404)
        try:
            lines_count = 100
            with open(fp, encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
            tail = lines[-lines_count:]
            return APIResponse.success(
                data={
                    "name": safe,
                    "total_lines": len(lines),
                    "lines": tail,
                }
            )
        except Exception as e:
            return APIResponse.error(message=str(e), status_code=500)


@monitor_ns.route("/ecosystem")
class EcosystemStatus(Resource):
    def get(self):
        ports_info = {}
        # Cargar SSoT
        g_ports = {}
        try:
            import json

            config_path = os.path.abspath(
                os.path.join(
                    os.path.dirname(__file__),
                    "..",
                    "..",
                    "..",
                    "..",
                    "..",
                    "_core",
                    "GLOBAL_CONFIG.json",
                )
            )
            if os.path.exists(config_path):
                with open(config_path, encoding="utf-8") as f:
                    g_ports = json.load(f).get("standard_ports", {})
        except Exception:
            pass

        # Extraer puertos dinámicamente
        p_postgres = g_ports.get("postgres_central", 5432)
        p_redis = g_ports.get("redis", 6380)
        p_qdrant = g_ports.get("qdrant", 6333)
        p_gpu_bridge = g_ports.get("gpu_bridge", 7600)
        p_npu_bridge = g_ports.get("npu_bridge", 7601)
        p_ai_bridge = g_ports.get("ai_bridge", 7603)
        p_secrets = g_ports.get("secrets_vault", 7608)
        p_balancer = g_ports.get("load_balancer", 7805)
        p_mcp_core = g_ports.get("mcp_core", 8081)
        p_mcp_ui = g_ports.get("mcp_ui", 8084)
        p_mcp_web = g_ports.get("mcp_web", 8082)

        # Puertos de proyecto
        proj_vl_back = (
            g_ports.get("projects", {}).get("villaluz", {}).get("backend_port", 8092)
        )
        proj_vl_front = (
            g_ports.get("projects", {}).get("villaluz", {}).get("frontend_port", 3005)
        )

        known_ports = {
            p_postgres: "PostgreSQL (Antigravity)",
            p_redis: "Redis Dev",
            p_qdrant: "Qdrant",
            p_gpu_bridge: "GPU Bridge",
            p_npu_bridge: "NPU Bridge",
            p_ai_bridge: "AI Processor",
            p_secrets: "Secrets Vault",
            p_balancer: "Load Balancer",
            8010: "MCP Windsurf",
            8011: "MCP Claude",
            8012: "MCP Cursor",
            8015: "MCP Gemini",
            8016: "MCP Codex",
            8017: "MCP OpenCode",
            8018: "MCP Antigravity",
            p_mcp_core: "MCP-Core",
            p_mcp_ui: "MCP-UI",
            p_mcp_web: "MCP-Web",
            proj_vl_back: "Flask Backend",
            proj_vl_front: "Vite Frontend",
            8888: "SearXNG",
        }
        for port, name in known_ports.items():
            import socket

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.3)
            result = sock.connect_ex(("127.0.0.1", port))
            sock.close()
            ports_info[str(port)] = {"name": name, "open": result == 0, "port": port}

        gpu_status = self._check_bridge_log("gpu", "logs/gpu_bridge_stdout.log")
        npu_status = self._check_bridge_log("npu", "logs/npu_bridge.log")
        mcp_status = self._check_mcp_status()

        return APIResponse.success(
            data={
                "timestamp": datetime.now(UTC).isoformat(),
                "ports": ports_info,
                "gpu": gpu_status,
                "npu": npu_status,
                "mcp": mcp_status,
                "services": {
                    "total_ports": len(known_ports),
                    "open_ports": sum(1 for p in ports_info.values() if p["open"]),
                },
            }
        )

    def _check_bridge_log(self, name, rel_path):
        fp = os.path.join(os.path.dirname(LOG_DIR), rel_path)
        if not os.path.isfile(fp):
            fp = os.path.join(LOG_DIR, os.path.basename(rel_path))
        if not os.path.isfile(fp):
            return {"status": "unknown", "message": "No log file found"}
        try:
            mtime = os.path.getmtime(fp)
            age_hours = (datetime.now().timestamp() - mtime) / 3600
            return {
                "status": "active" if age_hours < 24 else "stale",
                "last_updated": datetime.fromtimestamp(mtime, tz=UTC).isoformat(),
                "age_hours": round(age_hours, 1),
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _check_mcp_status(self):
        status_file = os.path.join(
            os.path.dirname(LOG_DIR), "maintenance", "devbrain_health_status.json"
        )
        if os.path.isfile(status_file):
            try:
                with open(status_file) as f:
                    return json.load(f)
            except Exception:
                pass
        return {"status": "unknown", "message": "No health status file found"}


@monitor_ns.route("/guides")
class GuideList(Resource):
    def get(self):
        guides = []
        for base_dir in DOCS_DIRS:
            if not os.path.isdir(base_dir):
                continue
            for root, dirs, files in os.walk(base_dir):
                for f in sorted(files):
                    if f.endswith(".md"):
                        rel = os.path.relpath(os.path.join(root, f), base_dir)
                        guides.append(
                            {
                                "name": f,
                                "path": rel,
                                "directory": os.path.basename(root)
                                if root != base_dir
                                else "",
                                "category": os.path.basename(
                                    os.path.dirname(os.path.join(root, f))
                                )
                                if root != base_dir
                                else "general",
                                "full_path": os.path.join(root, f),
                            }
                        )
        return APIResponse.success(data={"guides": guides, "total": len(guides)})


@monitor_ns.route("/guides/content")
class GuideContent(Resource):
    def get(self):
        from flask import request

        filepath = request.args.get("path", "")
        if not filepath or not os.path.isfile(filepath):
            return APIResponse.error(message="File not found", status_code=404)
        try:
            with open(filepath, encoding="utf-8", errors="replace") as f:
                content = f.read()
            return APIResponse.success(data={"path": filepath, "content": content})
        except Exception as e:
            return APIResponse.error(message=str(e), status_code=500)
