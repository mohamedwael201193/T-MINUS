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
const ownerId = "tea-da7j3urm6pss73ftp830";

async function rnd(path) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    headers: { accept: "application/json", authorization: `Bearer ${key}` },
  });
  const body = await res.json();
  return { status: res.status, body };
}

const list = await rnd(`/services?ownerId=${ownerId}&limit=50`);
console.log("list_status", list.status);
for (const row of list.body) {
  const s = row.service ?? row;
  const d = s.serviceDetails ?? {};
  console.log({
    id: s.id,
    name: s.name,
    type: s.type,
    repo: s.repo,
    branch: s.branch,
    slug: s.slug,
    dashboardUrl: s.dashboardUrl,
    region: d.region,
    plan: d.plan,
    runtime: d.runtime,
    url: d.url,
    buildCommand: d.envSpecificDetails?.buildCommand,
    startCommand: d.envSpecificDetails?.startCommand,
  });
}
