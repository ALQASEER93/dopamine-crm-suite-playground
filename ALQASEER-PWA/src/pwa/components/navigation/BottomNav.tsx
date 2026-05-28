import React from "react";
import { NavLink } from "react-router-dom";

const items = [
  {
    to: "/today-route",
    label: "مسار اليوم",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 3c4.97 0 9 4.03 9 9 0 5.25-5.1 9.9-8.27 11.61a1.5 1.5 0 0 1-1.46 0C8.1 21.9 3 17.25 3 12c0-4.97 4.03-9 9-9zm0 3.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zM11 11.25h2.5c.41 0 .75.34.75.75v5.25H11v-6z" />
      </svg>
    ),
  },
  {
    to: "/live-map",
    label: "الخريطة",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M15.5 4.5 9 6.76 4.7 5.1A1 1 0 0 0 3 6.03V19a1 1 0 0 0 .65.94l4.85 1.82 6.6-2.28 4.2 1.58A1 1 0 0 0 21 20.13V5a1 1 0 0 0-.65-.94l-4.85-1.82zM14 7.24v8.84l-5 1.73V8.96l5-1.72z" />
      </svg>
    ),
  },
  {
    to: "/visits",
    label: "الزيارات",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm1.5 4.5h7v2h-7v-2zm0 4h7v2h-7v-2zm0 4h4.5v2H8.5v-2z" />
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "التقارير",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M5 4h14v16H5V4zm3 11h2V9H8v6zm3 0h2V7h-2v8zm3 0h2v-4h-2v4z" />
      </svg>
    ),
  },
  {
    to: "/customers",
    label: "العملاء",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 15.5A6.5 6.5 0 0 1 11.5 13h1a6.5 6.5 0 0 1 6.5 6.5.5.5 0 0 1-.5.5H5.5a.5.5 0 0 1-.5-.5z" />
      </svg>
    ),
  },
  {
    to: "/account",
    label: "حسابي",
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 4.25a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5zM6.5 19a5.5 5.5 0 0 1 11 0v1H6.5v-1z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="التنقل السفلي">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          aria-label={item.label}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
