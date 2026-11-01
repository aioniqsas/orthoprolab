"use client";

import { cn } from "@repo/ui/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article" | "main" | "aside";
}

export function Section({ as: Comp = "section", className, ...props }: SectionProps) {
  return (
    <Comp
      className={cn(
        "w-full max-w-none rounded-xl border border-border bg-card p-5",
        className,
      )}
      {...props}
    />
  );
}

export function FullWidthStack({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex w-full max-w-none flex-col gap-6", className)} {...props} />
  );
}
