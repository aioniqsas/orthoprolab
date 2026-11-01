"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

interface ActionButtonProps extends ButtonProps {
  intent?: "primary" | "secondary" | "outline" | "ghost" | "danger";
}

export function ActionButton({
  intent = "primary",
  className,
  ...props
}: ActionButtonProps) {
  if (intent === "danger") {
    return <Button variant="destructive" className={className} {...props} />;
  }

  if (intent === "outline") {
    return <Button variant="outline" className={cn("border-border", className)} {...props} />;
  }

  if (intent === "ghost") {
    return <Button variant="ghost" className={className} {...props} />;
  }

  if (intent === "secondary") {
    return <Button variant="secondary" className={className} {...props} />;
  }

  return (
    <Button
      {...props}
      className={cn(
        "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        className,
      )}
    />
  );
}
