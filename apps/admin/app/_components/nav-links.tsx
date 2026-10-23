"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { NAV_ENTRIES, groupIsActive, isActive } from "./nav-items";
import type { NavGroup, NavItem } from "./nav-items";

function NavLink({ item, onNavigate, pathname }: { item: NavItem; onNavigate?: () => void; pathname: string }) {
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

function NavGroupItem({ group, onNavigate, pathname }: { group: NavGroup; onNavigate?: () => void; pathname: string }) {
  const active = groupIsActive(pathname, group);
  const [open, setOpen] = useState(active);

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          active
            ? "text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <group.icon aria-hidden className="size-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {/* Submenu — CSS max-height transition for smooth open/close */}
      <ul
        className={cn(
          "ml-3 mt-0.5 flex flex-col gap-0.5 overflow-hidden border-l border-border pl-3 transition-all duration-200",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {group.children.map((child) => (
          <li key={child.href}>
            <NavLink item={child} onNavigate={onNavigate} pathname={pathname} />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Client leaf: needed for `usePathname` and collapsible group state. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-col gap-1">
        {NAV_ENTRIES.map((entry) =>
          entry.kind === "group" ? (
            <NavGroupItem key={entry.label} group={entry} onNavigate={onNavigate} pathname={pathname} />
          ) : (
            <li key={entry.href}>
              <NavLink item={entry} onNavigate={onNavigate} pathname={pathname} />
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
