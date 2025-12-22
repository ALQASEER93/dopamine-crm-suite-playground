from __future__ import annotations

import os

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "none").lower()
LLM_LOCAL_HTTP_URL = os.environ.get("LLM_LOCAL_HTTP_URL")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
