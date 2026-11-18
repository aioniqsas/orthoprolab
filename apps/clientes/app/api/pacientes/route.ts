import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId");
  if (!doctorId) {
    return NextResponse.json({ error: "doctorId requerido" }, { status: 400 });
  }

  const token = (await cookies()).get("auth_token")?.value;
  const cookieHeader = token ? `auth_token=${token}` : "";

  try {
    const data: unknown[] = [];
    let page = 1;
    let total = Infinity;
    while (data.length < total) {
      const res = await fetch(
        `${API_URL}/mi-clinica/pacientes?doctorId=${encodeURIComponent(doctorId)}&page=${page}&size=100`,
        {
          headers: cookieHeader ? { Cookie: cookieHeader } : {},
          cache: "no-store",
        },
      );
      if (!res.ok) {
        return NextResponse.json(data, { status: 200 });
      }
      const body = (await res.json()) as { data: unknown[]; total: number };
      data.push(...body.data);
      total = body.total;
      if (body.data.length === 0) break;
      page += 1;
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
