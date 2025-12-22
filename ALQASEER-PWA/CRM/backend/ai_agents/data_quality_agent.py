from __future__ import annotations

from sqlalchemy import inspect, text

from ai_agents.base import AgentBase


class DataQualityAgent(AgentBase):
    name = "data_quality_agent"

    async def run(self) -> None:
        engine = self.db.get_bind()
        inspector = inspect(engine)
        if "pharmacies" not in inspector.get_table_names():
            self.add_insight(
                title="Pharmacies table missing",
                body="Could not find pharmacies table to check duplicates.",
                level="warning",
                entity_type="data_quality",
                entity_id="pharmacies",
            )
            return

        duplicates = list(
            self.db.execute(
                text(
                    """
                    SELECT lower(name) AS name_key,
                           lower(coalesce(city, '')) AS city_key,
                           lower(coalesce(area, '')) AS area_key,
                           COUNT(*) AS cnt
                    FROM pharmacies
                    GROUP BY name_key, city_key, area_key
                    HAVING COUNT(*) > 1
                    """
                )
            )
        )
        if duplicates:
            for dup in duplicates:
                self.add_insight(
                    title="Duplicate pharmacy detected",
                    body=f"Name='{dup.name_key}', city='{dup.city_key}', area='{dup.area_key}', count={dup.cnt}.",
                    level="warning",
                    entity_type="pharmacy",
                    entity_id=dup.name_key,
                )
        else:
            self.add_insight(
                title="Pharmacy data quality OK",
                body="No duplicate pharmacies detected by name+city+area heuristic.",
                level="info",
                entity_type="pharmacy",
                entity_id="all",
            )
