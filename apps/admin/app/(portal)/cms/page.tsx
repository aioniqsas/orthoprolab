import type { Metadata } from "next";
import { ComingSoon } from "../../_components/coming-soon";

export const metadata: Metadata = { title: "CMS" };

export default function Page() {
  return <ComingSoon title="Gestión web / CMS" />;
}
