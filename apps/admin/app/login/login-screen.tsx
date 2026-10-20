"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PortalLogin } from "@repo/ui/auth/portal-login";
import { api } from "@/lib/api";

export function LoginScreen() {
  const router = useRouter();
  const next = useSearchParams().get("next");

  return (
    <PortalLogin
      client={api}
      allowedRoles={["administrador"]}
      deniedMessage="Esta cuenta no tiene acceso al portal de administración."
      next={next}
      navigate={(path) => router.replace(path)}
      shell={{
        productName: "OrthoPro Admin",
        eyebrow: "Portal administrativo",
        heading: "Administración de OrthoPro Lab",
        description: "Acceso exclusivo para administradores del laboratorio.",
      }}
      description="Ingresa con tu cuenta de administrador."
    />
  );
}
