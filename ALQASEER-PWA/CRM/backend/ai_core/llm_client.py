from __future__ import annotations

import logging
from typing import Optional

from ai_core.config import LLM_LOCAL_HTTP_URL, LLM_PROVIDER, OPENAI_API_KEY

logger = logging.getLogger(__name__)


async def generate(prompt: str, system_prompt: Optional[str] = None) -> str:
    provider = LLM_PROVIDER
    if provider == "none":
        logger.info("LLM_PROVIDER=none; returning stub response.")
        return "LLM not configured. Provide OPENAI_API_KEY or LLM_LOCAL_HTTP_URL to enable generation."

    if provider == "local_http":
        if not LLM_LOCAL_HTTP_URL:
            logger.warning("LLM_LOCAL_HTTP_URL not set; falling back to stub response.")
            return "Local LLM endpoint not configured."
        try:
            import httpx
        except Exception as exc:  # noqa: BLE001
            logger.warning("httpx not available: %s", exc)
            return "Local LLM endpoint unavailable (httpx missing)."
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                LLM_LOCAL_HTTP_URL,
                json={"prompt": prompt, "system_prompt": system_prompt},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("text") or data.get("message") or ""

    if provider == "openai":
        try:
            import openai  # type: ignore
        except Exception as exc:  # noqa: BLE001
            logger.error("OpenAI package not available: %s", exc)
            return "OpenAI client not installed."

        if not OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not provided.")
            return "OPENAI_API_KEY missing."

        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt or "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content or ""

    logger.warning("Unknown LLM_PROVIDER=%s", provider)
    return "Unknown LLM provider."
