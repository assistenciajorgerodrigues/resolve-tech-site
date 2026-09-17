import { env } from "cloudflare:workers";
import { isAdminRequest } from "@/lib/auth";

export const runtime = "edge";
type Bindings = { DB?: D1Database; MEDIA?: R2Bucket };
const cf = env as unknown as Bindings;

export async function GET(request: Request) {
  const result: Record<string, unknown> = { ok: true, db: Boolean(cf.DB), media: Boolean(cf.MEDIA) };
  try {
    if (!cf.DB) throw new Error("DB ausente");
    await cf.DB.prepare("SELECT 1 AS ok").first();
    result.dbQuery = true;
  } catch (error) {
    result.ok = false; result.dbQuery = false; result.dbError = error instanceof Error ? error.message : String(error);
  }
  try {
    if (!cf.MEDIA) throw new Error("MEDIA ausente");
    await cf.MEDIA.head("__healthcheck__");
    result.mediaQuery = true;
  } catch (error) {
    result.ok = false; result.mediaQuery = false; result.mediaError = error instanceof Error ? error.message : String(error);
  }

  const url = new URL(request.url);
  if (url.searchParams.get("deep") === "1") {
    const admin = await isAdminRequest(request).catch(() => false);
    if (!admin) return Response.json({ ...result, deep: false, deepError: "Entre no /admin antes do teste profundo." }, { status: 401 });
    try {
      if (!cf.DB || !cf.MEDIA) throw new Error("Bindings ausentes");
      await cf.DB.prepare("CREATE TABLE IF NOT EXISTS __healthcheck (id TEXT PRIMARY KEY, created_at TEXT NOT NULL)").run();
      const id = crypto.randomUUID();
      await cf.DB.prepare("INSERT INTO __healthcheck (id, created_at) VALUES (?,?)").bind(id, new Date().toISOString()).run();
      const row = await cf.DB.prepare("SELECT id FROM __healthcheck WHERE id=?").bind(id).first<{ id: string }>();
      await cf.DB.prepare("DELETE FROM __healthcheck WHERE id=?").bind(id).run();
      if (row?.id !== id) throw new Error("Falha de leitura após gravação no D1");
      const key = `__healthcheck__/${id}.txt`;
      await cf.MEDIA.put(key, "ok", { httpMetadata: { contentType: "text/plain" } });
      const object = await cf.MEDIA.get(key);
      const text = object ? await object.text() : "";
      await cf.MEDIA.delete(key);
      if (text !== "ok") throw new Error("Falha de leitura após gravação no R2");
      result.deep = true;
      result.dbWrite = true;
      result.mediaWrite = true;
    } catch (error) {
      result.ok = false; result.deep = false; result.deepError = error instanceof Error ? error.message : String(error);
    }
  }
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
