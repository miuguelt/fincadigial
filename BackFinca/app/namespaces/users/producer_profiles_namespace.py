from app.models.producer_profiles import ProducerProfile
from app.utils.namespace_helpers import create_optimized_namespace

producer_profiles_ns = create_optimized_namespace(
    "producer-profiles",
    "Perfiles extendidos de productores rurales",
    ProducerProfile,
)
