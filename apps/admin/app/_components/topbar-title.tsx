"use client";

import { usePathname } from "next/navigation";
import { NAV_ENTRIES, isActive } from "./nav-items";
import type { NavGroup, NavItem } from "./nav-items";

function findActiveLabel(pathname: string): string | undefined {
  for (const entry of NAV_ENTRIES) {
    if (entry.kind === "group") {
      const child = (entry as NavGroup).children.find((c) => isActive(pathname, c.href));
      if (child) return `${entry.label} / ${child.label}`;
    } else if (isActive(pathname, (entry as NavItem).href)) {
      return (entry as NavItem).label;
    }
  }
  return undefined;
}

/** Client leaf: shows the title of the current section in the topbar. */
export function TopbarTitle() {
  const pathname = usePathname();
  return (
    <p className="truncate font-heading text-base font-semibold text-title">
      {findActiveLabel(pathname) ?? "OrthoPro Admin"}
    </p>
  );
}
