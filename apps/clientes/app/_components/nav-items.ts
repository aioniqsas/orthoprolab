import { ClipboardList, Home, Stethoscope, ReceiptText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  kind?: "item";
  href: string;
  label: string;
  icon: LucideIcon;
}

export type NavEntry = NavItem;

export const NAV_ENTRIES: readonly NavEntry[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/doctores", label: "Mis doctores", icon: Stethoscope },
  { href: "/ordenes", label: "Órdenes", icon: ClipboardList },
  { href: "/cuentas-cobro", label: "Cuentas de cobro", icon: ReceiptText },
];

/** A nav item is active for its own path and any nested path. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
