import { env } from "cloudflare:workers";

const ADMIN_USER = "jorgemlr";
const PASSWORD_SALT_B64 = "gVVXtla5rwoqpFVwdNCiDA==";
const PASSWORD_HASH_B64 = "kZBI5+PrqP02p2kIirIQjt5NXYJbypZgJf6VES8OwxQ=";
const PBKDF2_ITERATIONS = 210000;
const SESSION_COOKIE = "rt_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type Bindings = { DB?: D1Database };
const cf = env as unknown as Bindings;

function db(): D1Database {
  if (!cf.DB) throw new Error("Binding DB não está conectado ao Worker");
  return cf.DB;
}

export async function ensureAuthSchema() {
  await db().batch([
    db().prepare("CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)"),
  ]);
}

function b64ToBytes(value: string) {
  const raw = atob(value);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function bytesToB64(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}

export async function verifyAdminCredentials(user: string, password: string) {
  if (user !== ADMIN_USER) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64ToBytes(PASSWORD_SALT_B64), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  );
  return bytesToB64(derived) === PASSWORD_HASH_B64;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export async function createAdminSession() {
  await ensureAuthSchema();
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const created = new Date();
  const expires = new Date(created.getTime() + SESSION_TTL_SECONDS * 1000);
  await db().prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(created.toISOString()).run();
  await db().prepare("INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?,?,?)")
    .bind(token, created.toISOString(), expires.toISOString()).run();
  return { token, maxAge: SESSION_TTL_SECONDS };
}

export function adminSessionCookie(token: string, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearAdminSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function isAdminRequest(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return false;
  await ensureAuthSchema();
  const now = new Date().toISOString();
  const row = await db().prepare("SELECT token FROM admin_sessions WHERE token=? AND expires_at > ?")
    .bind(token, now).first<{ token: string }>();
  return Boolean(row?.token);
}

export async function destroyAdminSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || !cf.DB) return;
  await ensureAuthSchema();
  await db().prepare("DELETE FROM admin_sessions WHERE token=?").bind(token).run();
}
