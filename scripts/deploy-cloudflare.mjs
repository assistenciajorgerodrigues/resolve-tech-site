import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const workerName = "resolve-tech-site";
const databaseName = "resolve-tech-db";
const bucketName = "resolve-tech-media";
const configPath = "dist/server/wrangler.json";
const wrangler = "node_modules/wrangler/bin/wrangler.js";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function runJson(args) {
  try {
    const output = execFileSync(process.execPath, [wrangler, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    const start = Math.min(
      ...[output.indexOf("{"), output.indexOf("[")].filter((v) => v >= 0)
    );

    if (!Number.isFinite(start)) return null;
    return JSON.parse(output.slice(start));
  } catch {
    return null;
  }
}

function findD1Id(value) {
  if (!value || typeof value !== "object") return "";

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findD1Id(item);
      if (found) return found;
    }
    return "";
  }

  const binding = String(value.binding ?? value.name ?? value.variable_name ?? "");
  const type = String(value.type ?? value.binding_type ?? value.kind ?? "").toLowerCase();

  if (binding === "DB" || type.includes("d1")) {
    for (const key of ["database_id", "namespace_id", "id", "uuid"]) {
      const candidate = value[key];
      if (typeof candidate === "string" && uuidPattern.test(candidate)) return candidate;
    }

    for (const child of Object.values(value)) {
      if (typeof child === "string" && uuidPattern.test(child)) return child;
      const found = findD1Id(child);
      if (found) return found;
    }
  }

  for (const child of Object.values(value)) {
    const found = findD1Id(child);
    if (found) return found;
  }

  return "";
}

function versionIds(value, out = []) {
  if (!value || typeof value !== "object") return out;

  if (Array.isArray(value)) {
    for (const item of value) versionIds(item, out);
    return out;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === "string" &&
      key.toLowerCase().includes("version") &&
      uuidPattern.test(child)
    ) {
      out.push(child);
    } else {
      versionIds(child, out);
    }
  }

  return [...new Set(out)];
}

if (!existsSync(configPath)) {
  console.error(`Arquivo ${configPath} não existe. Execute pnpm build antes do deploy.`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
let databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || findD1Id(config);

if (!databaseId) {
  const status = runJson(["deployments", "status", "--name", workerName, "--json"]);

  for (const versionId of versionIds(status)) {
    const details = runJson(["versions", "view", versionId, "--name", workerName, "--json"]);
    databaseId = findD1Id(details);
    if (databaseId) break;
  }
}

if (!databaseId) {
  const versions = runJson(["versions", "list", "--name", workerName, "--json"]);

  for (const versionId of versionIds(versions)) {
    const details = runJson(["versions", "view", versionId, "--name", workerName, "--json"]);
    databaseId = findD1Id(details);
    if (databaseId) break;
  }
}

if (!databaseId) {
  const info = runJson(["d1", "info", databaseName, "--json"]);
  databaseId = findD1Id(info);
}

if (!databaseId) {
  console.error("Não foi possível descobrir automaticamente o UUID do D1 resolve-tech-db.");
  console.error("No Cloudflare Build, adicione a variável CLOUDFLARE_D1_DATABASE_ID com o UUID do banco e rode novamente.");
  process.exit(1);
}

config.d1_databases = [
  {
    binding: "DB",
    database_name: databaseName,
    database_id: databaseId,
  },
];

config.r2_buckets = [
  {
    binding: "MEDIA",
    bucket_name: bucketName,
  },
];

writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

console.log(`Binding D1 pronto: DB -> ${databaseName} (${databaseId})`);
console.log(`Binding R2 pronto: MEDIA -> ${bucketName}`);

const deploy = spawnSync(
  process.execPath,
  [wrangler, "deploy", "--config", configPath],
  { stdio: "inherit" }
);

process.exit(deploy.status ?? 1);
