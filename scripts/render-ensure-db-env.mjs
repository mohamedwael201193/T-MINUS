import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path) {
  if (!existsSync(path)) throw new Error("missing .env");
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnv(resolve(".env"));
const key = process.env.RENDER_API_KEY;
const ID = "srv-dao6t2rtqb8s73e52mbg";

async function rnd(method, path, body) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    method,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const ev = await rnd("GET", `/services/${ID}/env-vars`);
const rows = Array.isArray(ev.body) ? ev.body.map((r) => r.envVar ?? r) : [];
const keys = new Set(rows.map((e) => e.key));
console.log("has_DATABASE_URL", keys.has("DATABASE_URL"));
console.log("has_DIRECT_URL", keys.has("DIRECT_URL"));
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  if (keys.has(name)) continue;
  if (!process.env[name]) {
    console.error("missing local", name);
    continue;
  }
  const put = await rnd("PUT", `/services/${ID}/env-vars/${name}`, {
    value: process.env[name],
  });
  console.log("put", name, put.status);
}
