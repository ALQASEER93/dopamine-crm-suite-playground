import React from "react";

type KPIStatCardProps = {
  label: string;
  value: string | number;
  delta?: string;
  tone?: "neutral" | "positive" | "warning";
};

const toneColor: Record<NonNullable<KPIStatCardProps["tone"]>, string> = {
  neutral: "var(--muted)",
  positive: "var(--success)",
  warning: "var(--warning)",
};

export function KPIStatCard({ label, value, delta, tone = "neutral" }: KPIStatCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
      {delta ? (
        <div className="kpi-card__delta" style={{ color: toneColor[tone] }}>
          {delta}
        </div>
      ) : null}
    </div>
  );
}
