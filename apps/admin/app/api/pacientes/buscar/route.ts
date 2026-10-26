import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export async function GET(req: NextRequest) {
  const cedula = req.nextUrl.searchParams.get("cedula") ?? "";
  const token = (await cookies()).get("auth_token")?.value;
  const res = await fetch(
    `${API_URL}/pacientes/buscar?cedula=${encodeURIComponent(cedula)}`,
    {
      headers: { Cookie: token ? `auth_token=${token}` : "" },
      cache: "no-store",
    },
  );
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
