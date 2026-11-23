"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { Brand } from "./brand";
import { SiteNav } from "./site-nav";

export function SiteHeader() {
  // The home opens on the full-bleed hero, so the bar is fixed over it: a dark
  // scrim keeps the letters readable on the photo, and the bar turns solid as
  // soon as the page scrolls. Inner pages use the same solid bar, sticky.
  const overHero = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const solid = !overHero || scrolled;

  return (
    <header
      className={cn(
        "inset-x-0 top-0 z-50 transition-colors duration-300",
        overHero ? "fixed" : "sticky",
        solid
          ? "border-b border-border bg-background/90 backdrop-blur-xl"
          : "bg-gradient-to-b from-background/90 via-background/55 to-transparent",
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
