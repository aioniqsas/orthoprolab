import { Suspense } from "react";
import { getAccess } from "@/lib/session";

async function Greeting() {
  // The layout only gates presentation; pages re-check access themselves.
  const access = await getAccess();
  if (access.kind !== "allowed") return null;
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Hola, {access.usuario.nombres}</h1>
      <p className="text-sm text-muted-foreground">
        Bienvenido al portal de clientes de OrthoPro Lab.
      </p>
    </section>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Greeting />
    </Suspense>
  );
}
