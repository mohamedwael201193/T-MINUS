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

const owners = await rnd("GET", "/owners?limit=20");
const ownerList = Array.isArray(owners.body) ? owners.body : [];
const ownerId = (ownerList[0]?.owner ?? ownerList[0])?.id;
if (!ownerId) {
  console.error("no_owner", owners.status);
  process.exit(1);
}
console.log("owner", { id: ownerId, name: (ownerList[0]?.owner ?? ownerList[0])?.name });

const list = await rnd("GET", `/services?ownerId=${ownerId}&limit=50`);
if (!Array.isArray(list.body)) {
  console.error("list_fail", list.status);
  process.exit(1);
}
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
