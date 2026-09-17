import { env } from "cloudflare:workers";
export const runtime = "edge";
type Bindings = { DB?: D1Database; MEDIA?: R2Bucket };
const cf = env as unknown as Bindings;
export async function GET() {
  const result: Record<string, unknown> = { ok: true, db: Boolean(cf.DB), media: Boolean(cf.MEDIA) };
  try {
    if (!cf.DB) throw new Error("DB ausente");
    await cf.DB.prepare("SELECT 1 AS ok").first();
    result.dbQuery = true;
  } catch (error) { result.ok = false; result.dbQuery = false; result.dbError = error instanceof Error ? error.message : String(error); }
  try {
    if (!cf.MEDIA) throw new Error("MEDIA ausente");
    await cf.MEDIA.head("__healthcheck__");
    result.mediaQuery = true;
  } catch (error) { result.ok = false; result.mediaQuery = false; result.mediaError = error instanceof Error ? error.message : String(error); }
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
