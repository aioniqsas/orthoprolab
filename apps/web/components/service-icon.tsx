import {
  LayersIcon,
  ShieldCheckIcon,
  SmileIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { ServiceType } from "@/lib/catalog";

const ICONS: Record<ServiceType["icon"], LucideIcon> = {
  wrench: WrenchIcon,
  smile: SmileIcon,
  layers: LayersIcon,
  shield: ShieldCheckIcon,
};

export function ServiceIcon({ icon, className }: { icon: ServiceType["icon"]; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden />;
}
