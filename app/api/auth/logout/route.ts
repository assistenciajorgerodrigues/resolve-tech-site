import { clearAdminSessionCookie, destroyAdminSession } from "@/lib/auth";

export const runtime = "edge";

export async function POST(request: Request) {
  try { await destroyAdminSession(request); } catch {}
  return Response.json({ ok: true }, { headers: { "set-cookie": clearAdminSessionCookie() } });
}
