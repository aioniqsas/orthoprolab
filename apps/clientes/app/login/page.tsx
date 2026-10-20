import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "./login-screen";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    // useSearchParams needs a Suspense boundary under Cache Components.
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginScreen />
    </Suspense>
  );
}
