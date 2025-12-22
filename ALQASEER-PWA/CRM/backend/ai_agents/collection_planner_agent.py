from __future__ import annotations

from datetime import date, timedelta

from ai_agents.base import AgentBase


class CollectionPlannerAgent(AgentBase):
    name = "collection_planner_agent"

    async def run(self) -> None:
        planned_date = date.today() + timedelta(days=7)
        # Placeholder plan; will be replaced with real due balances when ledger mapping is confirmed.
        self.add_collection_plan(
            pharmacy_id=None,
            planned_date=planned_date,
            amount_expected=0,
            notes="Auto placeholder plan pending ledger data.",
            source="ai",
        )
        self.add_insight(
            title="Collection plan placeholder",
            body=f"Created placeholder collection plan for {planned_date} until ledger balances are available.",
            level="info",
            entity_type="system",
            entity_id="collection",
        )
