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
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep */
  }
  return { status: res.status, body: parsed };
}

const list = await rnd("GET", `/services?ownerId=${OWNER}&limit=50`);
for (const row of list.body) {
  const s = row.service ?? row;
  if (!String(s.name).startsWith("tminus")) continue;
  const d = s.serviceDetails ?? {};
  console.log("service", {
    id: s.id,
    name: s.name,
    type: s.type,
    slug: s.slug,
    dashboardUrl: s.dashboardUrl,
    url: d.url,
    plan: d.plan,
    runtime: d.runtime,
    suspended: s.suspended,
  });
  const deploys = await rnd("GET", `/services/${s.id}/deploys?limit=3`);
  const items = Array.isArray(deploys.body) ? deploys.body : [];
  for (const row2 of items) {
    const dep = row2.deploy ?? row2;
    console.log("deploy", {
      id: dep.id,
      status: dep.status,
      commit: dep.commit?.id || dep.commit,
      createdAt: dep.createdAt,
      finishedAt: dep.finishedAt,
    });
  }
  const ev = await rnd("GET", `/services/${s.id}/env-vars`);
  const keys = Array.isArray(ev.body)
    ? ev.body.map((x) => (x.envVar ?? x).key)
    : [];
  console.log("env_keys", keys.sort());
}
