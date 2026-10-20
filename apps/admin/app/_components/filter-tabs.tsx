import Link from "next/link";

export interface FilterTab {
  href: string;
  label: string;
  count: number;
  active: boolean;
}

/** Link-based filter (works without JS); the active item carries `aria-current`. */
export function FilterTabs({ label, tabs }: { label: string; tabs: FilterTab[] }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={
                tab.active
                  ? "inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground"
                  : "inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm hover:bg-muted"
              }
            >
              {tab.label}
              <span className="text-xs tabular-nums opacity-80">{tab.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
