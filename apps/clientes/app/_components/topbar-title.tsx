"use client";

import { usePathname } from "next/navigation";
import { NAV_ENTRIES, isActive } from "./nav-items";

function findActiveLabel(pathname: string): string | undefined {
  for (const entry of NAV_ENTRIES) {
    if (isActive(pathname, entry.href)) return entry.label;
  }
  return undefined;
}

export function TopbarTitle() {
  const pathname = usePathname();
  return (
    <p className="truncate font-heading text-base font-semibold text-title">
      {findActiveLabel(pathname) ?? "Portal de clínicas"}
    </p>
  );
}
