import React from "react";
import { NavLink } from "react-router-dom";
import { Icons } from "../icons";

const primary = [
  { to: "/today", label: "اليوم", icon: Icons.Home },
  { to: "/route", label: "المسار", icon: Icons.Route },
  { to: "/map", label: "الخريطة", icon: Icons.MapPin },
  { to: "/visits", label: "الزيارات", icon: Icons.Visits },
  { to: "/account", label: "الحساب", icon: Icons.User },
];

const secondary = [
  { to: "/accounts", label: "العملاء", icon: Icons.Accounts },
  { to: "/targets", label: "الأهداف", icon: Icons.Target },
  { to: "/notifications", label: "الإشعارات", icon: Icons.Bell },
  { to: "/sync", label: "المزامنة", icon: Icons.Sync },
  { to: "/settings", label: "الإعدادات", icon: Icons.Settings },
];

export function NavigationShell() {
  return (
    <>
      <aside className="nav-rail" aria-label="التنقل الرئيسي">
        <div className="nav-rail__brand">Dopamine Rep</div>
        {primary.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              {item.label}
            </NavLink>
          );
        })}
        <div className="muted" style={{ marginTop: 16 }}>المهام</div>
        {secondary.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </aside>

      <nav className="bottom-nav" aria-label="التنقل السفلي">
        {primary.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
