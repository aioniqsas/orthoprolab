import { Building2, ClipboardList, FileText, Package, ReceiptText, Settings2, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  kind?: "item";
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  kind: "group";
  label: string;
  icon: LucideIcon;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const NAV_ENTRIES: readonly NavEntry[] = [
  {
    kind: "group",
    label: "Gestión",
    icon: Settings2,
    children: [
      { href: "/ordenes", label: "Órdenes", icon: ClipboardList },
      { href: "/cuentas-cobro", label: "Cuentas de cobro", icon: ReceiptText },
      { href: "/clinicas", label: "Clínicas", icon: Building2 },
      { href: "/catalogo", label: "Catálogo", icon: Package },
    ],
  },
  { href: "/usuarios", label: "Usuarios y permisos", icon: UsersRound },
  { href: "/cms", label: "Gestión web / CMS", icon: FileText },
];

/** A nav item is active for its own path and any nested path. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function groupIsActive(pathname: string, group: NavGroup): boolean {
  return group.children.some((child) => isActive(pathname, child.href));
}
