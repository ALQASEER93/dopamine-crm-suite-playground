import React from "react";

type ListItemProps = {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
};

export function ListItem({ title, subtitle, meta, action, onClick }: ListItemProps) {
  const Component = onClick ? "button" : "div";
  return (
    <Component className="list-item" onClick={onClick as never}>
      <div>
        <div className="list-item__title">{title}</div>
        {subtitle ? <div className="list-item__subtitle">{subtitle}</div> : null}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {meta}
        {action}
      </div>
    </Component>
  );
}
