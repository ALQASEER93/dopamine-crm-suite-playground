from __future__ import annotations

from datetime import date

from ai_agents.base import AgentBase
from ai_core import llm_client, prompts


class ContentHelperAgent(AgentBase):
    name = "content_helper_agent"

    async def run(self) -> None:
        prompt = prompts.payment_reminder_prompt("Pharmacy", amount=0, due_date=date.today())
        message_en = await llm_client.generate(prompt, system_prompt="Provide a concise, polite payment reminder in English.")
        message_ar = await llm_client.generate(
            prompt, system_prompt="Provide a concise, polite payment reminder in Arabic."
        )

        self.add_message_draft(
            channel="email",
            target_type="pharmacy",
            target_id="sample",
            language="en",
            subject="Payment reminder (draft)",
            body=message_en,
        )
        self.add_message_draft(
            channel="email",
            target_type="pharmacy",
            target_id="sample",
            language="ar",
            subject="تذكير بالدفع (مسودة)",
            body=message_ar,
        )
