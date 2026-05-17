"""
Prometheus metrics used across matching-service modules.
"""
from prometheus_client import Counter

MATCHING_CACHE_EVENTS_TOTAL = Counter(
    "matching_cache_events_total",
    "Matching cache events by cache type and outcome.",
    ["cache", "outcome"],
)

MATCHING_RECOMMENDATION_FALLBACK_TOTAL = Counter(
    "matching_recommendation_fallback_total",
    "Recommendation requests that returned the fast empty fallback.",
    ["target_type"],
)
