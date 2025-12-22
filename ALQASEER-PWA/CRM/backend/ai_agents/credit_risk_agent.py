from __future__ import annotations

from ai_agents.base import AgentBase


class CreditRiskAgent(AgentBase):
    name = "credit_risk_agent"

    async def run(self) -> None:
        self.add_insight(
            title="Credit risk scan pending data",
            body="Ledger receivables will be scored when pharmacy balances are mapped; no risk computed yet.",
            level="warning",
            entity_type="system",
            entity_id="dpm_ledger",
        )
