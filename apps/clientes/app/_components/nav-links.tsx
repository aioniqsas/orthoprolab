"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { NAV_ENTRIES, isActive } from "./nav-items";
import type { NavItem } from "./nav-items";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <item.icon aria-hidden className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-col gap-1">
        {NAV_ENTRIES.map((entry) => (
          <li key={entry.href}>
            <NavLink item={entry} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
