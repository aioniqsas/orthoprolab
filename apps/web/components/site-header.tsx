"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { Brand } from "./brand";
import { SiteNav } from "./site-nav";

export function SiteHeader() {
  // The home opens on the full-bleed hero, so the bar floats over it and only
  // becomes a solid sticky bar on the inner pages.
  const overHero = usePathname() === "/";

  return (
    <header
      className={cn(
        "z-50",
        overHero
          ? "absolute inset-x-0 top-0"
          : "sticky top-0 border-b border-border bg-background/85 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-2 lg:px-12">
        <Link
          href="/"
          prefetch
          aria-label="OrthoPro Lab, inicio"
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl text-xl whitespace-nowrap"
        >
          <Brand />
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
