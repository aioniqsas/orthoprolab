"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./nav-items";

/** Client leaf: shows the title of the current section in the topbar. */
export function TopbarTitle() {
  const pathname = usePathname();
  const item = NAV_ITEMS.find((i) => isActive(pathname, i.href));
  return (
    <p className="truncate font-heading text-base font-semibold text-title">
      {item?.label ?? "OrthoPro Admin"}
    </p>
  );
}
