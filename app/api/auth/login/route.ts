import { adminSessionCookie, createAdminSession, verifyAdminCredentials } from "@/lib/auth";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { user?: string; password?: string };
    const valid = await verifyAdminCredentials(String(body.user || ""), String(body.password || ""));
    if (!valid) return Response.json({ ok: false, error: "Usuário ou senha incorretos." }, { status: 401 });
    const session = await createAdminSession();
    return Response.json({ ok: true }, { headers: { "set-cookie": adminSessionCookie(session.token, session.maxAge) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao entrar";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
