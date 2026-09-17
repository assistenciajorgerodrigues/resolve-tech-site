import { env } from "cloudflare:workers";
import { isAdminRequest } from "@/lib/auth";

export const runtime = "edge";
type Bindings = { MEDIA?: R2Bucket };
const cf = env as unknown as Bindings;

function media(): R2Bucket {
  if (!cf.MEDIA) throw new Error("Binding MEDIA não está conectado ao Worker");
  return cf.MEDIA;
}
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro interno";
  console.error("/api/media:", error);
  return Response.json({ ok:false, error:message }, { status:500 });
}

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key) return new Response("Arquivo não informado", { status: 400 });
    const object = await media().get(key);
    if (!object) return new Response("Arquivo não encontrado", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=3600");
    return new Response(object.body, { headers });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest(request))) return Response.json({ ok:false, error:"Sessão administrativa expirada." }, { status:401 });
    const form = await request.formData();
    const file = form.get("file");
    const id = String(form.get("id") || crypto.randomUUID());
    const kind = String(form.get("kind") || "portfolio");
    if (!(file instanceof File)) return Response.json({ ok: false, error: "Arquivo ausente" }, { status: 400 });
    const max = kind === "signature" ? 5_000_000 : 100_000_000;
    if (file.size > max) return Response.json({ ok:false, error:`Arquivo acima do limite de ${Math.round(max/1_000_000)} MB.` }, { status:413 });
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo";
    const key = `${kind}/${id}-${safeName}`;
    await media().put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { originalName: file.name } });
    return Response.json({ ok: true, key, src: `/api/media?key=${encodeURIComponent(key)}` });
  } catch (error) { return fail(error); }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminRequest(request))) return Response.json({ ok:false, error:"Sessão administrativa expirada." }, { status:401 });
    const key = new URL(request.url).searchParams.get("key");
    if (!key) return Response.json({ ok: false }, { status: 400 });
    await media().delete(key);
    return Response.json({ ok: true });
  } catch (error) { return fail(error); }
}
