"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { NAV_LINKS } from "@/lib/site";
import { Brand } from "./brand";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Principal" className="hidden flex-nowrap items-center gap-1 md:flex">
        {NAV_LINKS.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-card text-highlight"
                  : "text-muted-foreground hover:text-body",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <Sheet>
        <SheetTrigger
          aria-label="Abrir menú"
          className="inline-flex size-10 items-center justify-center rounded-xl text-body transition-transform hover:bg-card active:scale-[0.98] md:hidden"
        >
          <MenuIcon className="size-5" />
        </SheetTrigger>
        <SheetContent side="right" className="bg-background">
          <SheetTitle className="px-4 pt-4">
            <Brand className="text-xl" />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navegación del sitio
          </SheetDescription>
          <nav aria-label="Móvil" className="flex flex-col gap-1 p-4">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <SheetClose
                  key={href}
                  render={
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                    />
                  }
                  className={cn(
                    "rounded-xl px-3 py-3 text-base font-medium transition-colors",
                    active
                      ? "bg-card text-highlight"
                      : "text-muted-foreground hover:text-body",
                  )}
                >
                  {label}
                </SheetClose>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
