import type { Metadata } from "next";
import { ComingSoon } from "../../_components/coming-soon";

export const metadata: Metadata = { title: "Catálogo" };

export default function Page() {
  return <ComingSoon title="Catálogo y aranceles" />;
}
