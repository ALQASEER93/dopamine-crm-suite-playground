from __future__ import annotations

from ai_agents.base import AgentBase


class SalesTrendAgent(AgentBase):
    name = "sales_trend_agent"

    async def run(self) -> None:
        self.add_insight(
            title="Sales trends placeholder",
            body="Sales trend analysis will be enriched once ledger/pharmacy mapping is finalized.",
            level="info",
            entity_type="system",
            entity_id="dpm_ledger",
        )
