import { DownloadIcon } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { CATALOG_PDF_HREF } from "@/lib/catalog";

// Plain anchor: Button is not polymorphic for links, and no client JS is needed.
export function PriceDownloadButton({ className }: { className?: string }) {
  return (
    <a
      href={CATALOG_PDF_HREF}
      download
      className={cn(buttonVariants({ size: "lg" }), className)}
    >
      <DownloadIcon aria-hidden />
      Ver precios
    </a>
  );
}
