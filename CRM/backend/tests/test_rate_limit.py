from __future__ import annotations

from core.config import settings
from middleware.rate_limit import configure_rate_limits, reset_rate_limit_state


def test_rate_limit_triggers(client):
    original_rate = settings.rate_limit_per_minute
    original_burst = settings.rate_limit_burst

    configure_rate_limits(1, 1)
    reset_rate_limit_state()

    try:
        first = client.get("/status")
        second = client.get("/status")

        assert first.status_code == 200
        assert second.status_code == 429
    finally:
        configure_rate_limits(original_rate, original_burst)
        reset_rate_limit_state()
