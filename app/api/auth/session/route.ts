import { isAdminRequest } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: Request) {
  try { return Response.json({ ok: true, authenticated: await isAdminRequest(request) }); }
  catch { return Response.json({ ok: true, authenticated: false }); }
}
