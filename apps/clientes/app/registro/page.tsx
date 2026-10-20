import type { Metadata } from "next";
import { RegistroScreen } from "./registro-screen";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return <RegistroScreen />;
}
