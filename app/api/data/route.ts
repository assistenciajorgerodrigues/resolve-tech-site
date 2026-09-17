import { env } from "cloudflare:workers";

export const runtime = "edge";

type Bindings = { DB: D1Database; MEDIA: R2Bucket };
const cf = env as unknown as Bindings;

const defaultCompany = { brand: "Resolve Tech", technician: "Técnico responsável", document: "CPF/CNPJ: informe no painel", phone: "(21) 99999-9999", whatsapp: "5521999999999", address: "Rio de Janeiro - RJ", warranty: "90 dias" };

async function ensureSchema() {
  await cf.DB.batch([
    cf.DB.prepare("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)"),
    cf.DB.prepare("CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL)"),
    cf.DB.prepare("CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL)"),
    cf.DB.prepare("CREATE TABLE IF NOT EXISTS portfolio (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL)"),
    cf.DB.prepare("CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL)"),
  ]);
}

function parseRows<T>(rows: { data: string }[] | undefined): T[] {
  return (rows || []).map((row) => JSON.parse(row.data) as T);
}

function mediaKeyFromSrc(src?: string) {
  if (!src) return null;
  try { return new URL(src, "https://local.invalid").searchParams.get("key"); } catch { return null; }
}

export async function GET() {
  await ensureSchema();
  const [companyRow, enabledRow, receiptsResult, reviewsResult, portfolioResult] = await Promise.all([
    cf.DB.prepare("SELECT value FROM kv WHERE key = 'company'").first<{ value: string }>(),
    cf.DB.prepare("SELECT value FROM kv WHERE key = 'portfolioEnabled'").first<{ value: string }>(),
    cf.DB.prepare("SELECT data FROM receipts ORDER BY created_at DESC").all<{ data: string }>(),
    cf.DB.prepare("SELECT data FROM reviews ORDER BY created_at DESC").all<{ data: string }>(),
    cf.DB.prepare("SELECT data FROM portfolio ORDER BY created_at DESC").all<{ data: string }>(),
  ]);
  return Response.json({
    company: companyRow?.value ? JSON.parse(companyRow.value) : defaultCompany,
    portfolioEnabled: enabledRow?.value === "true",
    receipts: parseRows(receiptsResult.results),
    reviews: parseRows(reviewsResult.results),
    portfolioVideos: parseRows(portfolioResult.results),
  });
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as any;
  const action = String(body.action || "");

  if (action === "saveCompany") {
    await cf.DB.prepare("INSERT INTO kv (key,value) VALUES ('company',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(body.company)).run();
    return Response.json({ ok: true });
  }
  if (action === "saveReceipt") {
    const item = body.receipt;
    await cf.DB.prepare("INSERT INTO receipts (id,data,created_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, created_at=excluded.created_at").bind(item.id, JSON.stringify(item), item.createdAt || new Date().toISOString()).run();
    return Response.json({ ok: true });
  }
  if (action === "deleteReceipt") {
    await cf.DB.prepare("DELETE FROM receipts WHERE id=?").bind(body.id).run();
    return Response.json({ ok: true });
  }
  if (action === "addReview") {
    const review = body.review;
    if (review?.photo?.startsWith("data:image/")) {
      const match = review.photo.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        const ext = (match[1].split("/")[1] || "jpg").replace("jpeg", "jpg");
        const key = `reviews/${review.id}.${ext}`;
        await cf.MEDIA.put(key, bytes, { httpMetadata: { contentType: match[1] } });
        review.photo = `/api/media?key=${encodeURIComponent(key)}`;
      }
    }
    await cf.DB.prepare("INSERT INTO reviews (id,data,created_at) VALUES (?,?,?)").bind(review.id, JSON.stringify(review), review.createdAt).run();
    return Response.json({ ok: true, review });
  }
  if (action === "deleteReview") {
    const row = await cf.DB.prepare("SELECT data FROM reviews WHERE id=?").bind(body.id).first<{ data: string }>();
    if (row?.data) { const key = mediaKeyFromSrc(JSON.parse(row.data).photo); if (key) await cf.MEDIA.delete(key); }
    await cf.DB.prepare("DELETE FROM reviews WHERE id=?").bind(body.id).run();
    return Response.json({ ok: true });
  }
  if (action === "savePortfolio") {
    const item = body.video;
    await cf.DB.prepare("INSERT INTO portfolio (id,data,created_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, created_at=excluded.created_at").bind(item.id, JSON.stringify(item), item.createdAt).run();
    return Response.json({ ok: true });
  }
  if (action === "deletePortfolio") {
    const row = await cf.DB.prepare("SELECT data FROM portfolio WHERE id=?").bind(body.id).first<{ data: string }>();
    if (row?.data) { const key = mediaKeyFromSrc(JSON.parse(row.data).src); if (key) await cf.MEDIA.delete(key); }
    await cf.DB.prepare("DELETE FROM portfolio WHERE id=?").bind(body.id).run();
    return Response.json({ ok: true });
  }
  if (action === "portfolioEnabled") {
    await cf.DB.prepare("INSERT INTO kv (key,value) VALUES ('portfolioEnabled',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(Boolean(body.enabled))).run();
    return Response.json({ ok: true });
  }
  if (action === "quote") {
    const id = crypto.randomUUID();
    await cf.DB.prepare("INSERT INTO quotes (id,data,created_at) VALUES (?,?,?)").bind(id, JSON.stringify(body.quote), new Date().toISOString()).run();
    return Response.json({ ok: true, id });
  }
  return Response.json({ ok: false, error: "Ação inválida" }, { status: 400 });
}
