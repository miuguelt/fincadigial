import ast
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
source_file = (
    BACKEND_ROOT / "app" / "namespaces" / "finanzas" / "analytics_namespace.py"
)
target_file = BACKEND_ROOT / "app" / "namespaces" / "analytics" / "legacy.py"

if not source_file.exists():
    print(f"File not found: {source_file}")
    exit(1)

with open(source_file, encoding="utf-8") as f:
    source_code = f.read()

# Classes to remove
classes_to_remove = [
    "DashboardStats",
    "CompleteDashboardStats",
    "SystemAlerts",
    "AnimalMedicalHistory",
    "ProductionStatistics",
    "HealthStatistics",
    "AIInsights",
    "AnimalWeightPrediction",
    "AnimalMarketReadiness",
    "GrowthAnomalyMonitor",
    "LiveAnalyticsResource",
]


class ClassRemover(ast.NodeTransformer):
    def visit_ClassDef(self, node):
        if node.name in classes_to_remove:
            return None
        return node


tree = ast.parse(source_code)
remover = ClassRemover()
new_tree = remover.visit(tree)
ast.fix_missing_locations(new_tree)

# We can use ast.unparse in Python 3.9+
new_code = ast.unparse(new_tree)

# Replace namespace
new_code = new_code.replace("analytics_ns = Namespace(", "legacy_ns = Namespace(")
new_code = new_code.replace("analytics_ns.model", "legacy_ns.model")
new_code = new_code.replace("@analytics_ns.route", "@legacy_ns.route")
new_code = new_code.replace("@analytics_ns.doc", "@legacy_ns.doc")
new_code = new_code.replace(
    "analytics_ns = Namespace(\n    'analytics',\n    description='📊 Analytics y Dashboard - Sistema de Gestión Integral',\n    path='/analytics'\n)",
    "legacy_ns = Namespace('analytics/legacy', path='/analytics', description='Legacy Analytics')",
)

with open(target_file, "w", encoding="utf-8") as f:
    f.write(new_code)

# Delete the old file
source_file.unlink()
print("Migration successful.")
