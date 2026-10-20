"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PortalLogin } from "@repo/ui/auth/portal-login";
import { api } from "@/lib/api";

export function LoginScreen() {
  const router = useRouter();
  const next = useSearchParams().get("next");

  return (
    <PortalLogin
      client={api}
      allowedRoles={["odontologo", "asistente"]}
      deniedMessage="Usa el portal de administración con esta cuenta."
      next={next}
      navigate={(path) => router.replace(path)}
      shell={{
        productName: "Portal de clientes",
        eyebrow: "Odontólogos y clínicas",
        heading: "Portal de clientes de OrthoPro Lab",
        description: "Inicia sesión con tu cuenta para continuar.",
      }}
      description="Ingresa con tu correo y contraseña."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-primary underline-offset-4 hover:underline">
            Regístrate
          </Link>
        </>
      }
    />
  );
}
