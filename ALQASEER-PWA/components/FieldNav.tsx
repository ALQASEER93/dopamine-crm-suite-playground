"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/field", label: "Today\u2019s Route" },
  { href: "/field/live-map", label: "Live Map" },
  { href: "/field/history", label: "Visit History" },
];

export default function FieldNav() {
  const pathname = usePathname();

  return (
    <nav className="field-nav">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/field" && pathname?.startsWith(tab.href));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "field-nav__link" + (isActive ? " field-nav__link--active" : "")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
