"use client";

import * as React from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { NavLinks } from "./nav-links";

/** Client leaf: collapsible sidebar for small screens. */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<ActionButton intent="outline"  size="icon" className="lg:hidden" />}
        aria-label="Abrir menú de navegación"
      >
        <MenuIcon aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[85vw]">
        <SheetHeader>
          <SheetTitle className="font-heading">OrthoPro Admin</SheetTitle>
          <SheetDescription>Navegación del portal</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
