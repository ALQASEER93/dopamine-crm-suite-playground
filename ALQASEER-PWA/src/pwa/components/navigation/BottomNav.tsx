import React from "react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/today-route", label: "مسار اليوم" },
  { to: "/live-map", label: "الخريطة الحية" },
  { to: "/visits", label: "الزيارات" },
  { to: "/customers", label: "العملاء" },
  { to: "/account", label: "حسابي" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
