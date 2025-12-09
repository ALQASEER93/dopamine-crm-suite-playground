from __future__ import annotations

from ai_agents.base import AgentBase


class StockRiskAgent(AgentBase):
    name = "stock_risk_agent"

    async def run(self) -> None:
        self.add_insight(
            title="Stock risk scan placeholder",
            body="No stock movement source wired yet; hook CRM inventory to enable slow-mover and stock-out detection.",
            level="info",
            entity_type="inventory",
            entity_id="global",
        )
