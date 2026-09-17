import { env } from "cloudflare:workers";

export const runtime = "edge";
type Bindings = { MEDIA: R2Bucket };
const cf = env as unknown as Bindings;

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return new Response("Arquivo não informado", { status: 400 });
  const object = await cf.MEDIA.get(key);
  if (!object) return new Response("Arquivo não encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=3600");
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const id = String(form.get("id") || crypto.randomUUID());
  const kind = String(form.get("kind") || "portfolio");
  if (!(file instanceof File)) return Response.json({ ok: false, error: "Arquivo ausente" }, { status: 400 });
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo";
  const key = `${kind}/${id}-${safeName}`;
  await cf.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { originalName: file.name } });
  return Response.json({ ok: true, key, src: `/api/media?key=${encodeURIComponent(key)}` });
}

export async function DELETE(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return Response.json({ ok: false }, { status: 400 });
  await cf.MEDIA.delete(key);
  return Response.json({ ok: true });
}
