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
    const res = await fetch(
      `${API_URL}/mi-clinica/pacientes?doctorId=${encodeURIComponent(doctorId)}`,
      {
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
