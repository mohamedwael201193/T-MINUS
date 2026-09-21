import { readFileSync, existsSync, writeFileSync } from "node:fs";
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
const ID = "srv-dao6t2rtqb8s73e52mbg";
const URL = "https://tminus-api-k2d2.onrender.com";

async function rnd(path) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    headers: { accept: "application/json", authorization: `Bearer ${key}` },
  });
  return { status: res.status, body: await res.json() };
}

const started = Date.now();
let last = null;
while (Date.now() - started < 12 * 60 * 1000) {
  const deploys = await rnd(`/services/${ID}/deploys?limit=1`);
  const dep = deploys.body?.[0]?.deploy ?? deploys.body?.[0] ?? {};
  last = {
    elapsed_s: Math.round((Date.now() - started) / 1000),
    deployStatus: dep.status,
    commit: dep.commit?.id,
    finishedAt: dep.finishedAt,
  };
  console.log(JSON.stringify(last));
  if (
    [
      "live",
      "update_failed",
      "build_failed",
      "canceled",
      "deactivated",
    ].includes(dep.status)
  ) {
    break;
  }
  await new Promise((r) => setTimeout(r, 20000));
}

const evidence = { deploy: last, probes: {} };
for (const path of ["/health", "/ready", "/v1/feed", "/v1/quote", "/v1/keeper", "/v1/receipts", "/v1/program"]) {
  try {
    const res = await fetch(URL + path, { headers: { accept: "application/json" } });
    const text = await res.text();
    evidence.probes[path] = {
      status: res.status,
      body: text.slice(0, 400),
    };
  } catch (err) {
    evidence.probes[path] = {
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
writeFileSync(resolve("evidence/render-free-health.json"), JSON.stringify(evidence, null, 2));
console.log("wrote evidence/render-free-health.json");
console.log(JSON.stringify(evidence.probes, null, 2));
