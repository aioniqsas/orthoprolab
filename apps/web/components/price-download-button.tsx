import { DownloadIcon } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { CATALOG_PDF_HREF } from "@/lib/catalog";

// Plain anchor: Button is not polymorphic for links, and no client JS is needed.
export function PriceDownloadButton({ label, className }: { label: string; className?: string }) {
  return (
    <a
      href={CATALOG_PDF_HREF}
      download
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-auto gap-2 rounded-xl px-6 py-3.5 font-semibold whitespace-nowrap transition-transform active:scale-[0.98]",
        className,
      )}
    >
      <DownloadIcon aria-hidden />
      {label}
    </a>
  );
}
