import { Building2, Cog, FileText, Package, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/ordenes", label: "Gestión de órdenes", icon: Cog },
  { href: "/clinicas", label: "Clínicas odontológicas", icon: Building2 },
  { href: "/catalogo", label: "Catálogo y aranceles", icon: Package },
  { href: "/usuarios", label: "Usuarios y permisos", icon: UsersRound },
  { href: "/cms", label: "Gestión web / CMS", icon: FileText },
];

/** A nav item is active for its own path and any nested path. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
