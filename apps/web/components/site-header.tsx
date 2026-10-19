import Link from "next/link";
import { Brand } from "./brand";
import { SiteNav } from "./site-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 lg:px-12">
        <Link
          href="/"
          prefetch
          aria-label="OrthoPro Lab, inicio"
          className="shrink-0 rounded-lg text-xl whitespace-nowrap"
        >
          <Brand />
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
