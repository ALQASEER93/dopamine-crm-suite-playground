from functools import lru_cache

from config.settings import Settings, settings  # re-export for backward compatibility


@lru_cache
def get_settings() -> Settings:
    return settings
