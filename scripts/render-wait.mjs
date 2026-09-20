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
loadEnv(resolve(process.cwd(), ".env"));
const key = process.env.RENDER_API_KEY;
const OWNER = "tea-da7j3urm6pss73ftp830";

async function rnd(path) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    headers: { accept: "application/json", authorization: `Bearer ${key}` },
  });
  return { status: res.status, body: await res.json() };
}

const targets = [
  { name: "tminus-api", id: "srv-dao6qhp42hec738m40eg" },
  { name: "tminus-keeper", id: "srv-dao6pop42hec738m1fkg" },
];

const started = Date.now();
const timeoutMs = 8 * 60 * 1000;

while (Date.now() - started < timeoutMs) {
  const snapshot = [];
  for (const t of targets) {
    const deploys = await rnd(`/services/${t.id}/deploys?limit=1`);
    const dep = (deploys.body?.[0]?.deploy ?? deploys.body?.[0]) || {};
    snapshot.push({
      name: t.name,
      deployStatus: dep.status,
      commit: dep.commit?.id,
      updated: dep.updatedAt || dep.finishedAt,
    });
  }
  console.log(JSON.stringify({ elapsed_s: Math.round((Date.now() - started) / 1000), snapshot }));
  if (snapshot.every((s) => s.deployStatus === "live" || s.deployStatus === "update_failed" || s.deployStatus === "build_failed" || s.deployStatus === "canceled" || s.deployStatus === "deactivated")) {
    break;
  }
  await new Promise((r) => setTimeout(r, 20000));
}

try {
  const health = await fetch("https://tminus-api.onrender.com/health");
  const text = await health.text();
  console.log("health", health.status, text.slice(0, 300));
} catch (e) {
  console.log("health_error", e instanceof Error ? e.message : "unknown");
}

const logs = await rnd(`/logs?ownerId=${OWNER}&resource=srv-dao6qhp42hec738m40eg&limit=20`);
console.log("logs_status", logs.status, Array.isArray(logs.body) ? logs.body.length : Object.keys(logs.body || {}));
