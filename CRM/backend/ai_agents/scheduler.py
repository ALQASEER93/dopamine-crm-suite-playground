from __future__ import annotations

import asyncio
import logging
import os

from ai_agents.collection_planner_agent import CollectionPlannerAgent
from ai_agents.content_helper_agent import ContentHelperAgent
from ai_agents.credit_risk_agent import CreditRiskAgent
from ai_agents.data_quality_agent import DataQualityAgent
from ai_agents.sales_trend_agent import SalesTrendAgent
from ai_agents.stock_risk_agent import StockRiskAgent

logger = logging.getLogger(__name__)


async def run_agents_once() -> None:
    agents = [
        SalesTrendAgent(),
        CreditRiskAgent(),
        CollectionPlannerAgent(),
        StockRiskAgent(),
        DataQualityAgent(),
        ContentHelperAgent(),
    ]
    for agent in agents:
        try:
            await agent.run()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Agent %s failed: %s", agent.name, exc)
        finally:
            agent.close()


async def run_scheduled() -> None:
    await run_agents_once()


def main() -> None:
    enabled = os.environ.get("AI_SCHEDULER_ENABLED", "0")
    if enabled != "1":
        logger.info("AI_SCHEDULER_ENABLED is not set to 1; scheduler will not run.")
        return
    asyncio.run(run_agents_once())


if __name__ == "__main__":
    main()
