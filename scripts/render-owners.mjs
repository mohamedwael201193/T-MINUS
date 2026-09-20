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
if (!key) {
  console.error("RENDER_API_KEY missing");
  process.exit(1);
}

async function rnd(path, init = {}) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

const owners = await rnd("/owners?limit=50");
console.log("owners_status", owners.status);
if (Array.isArray(owners.body)) {
  for (const row of owners.body) {
    const o = row.owner ?? row;
    console.log("owner", {
      id: o.id,
      name: o.name,
      email: o.email,
      type: o.type,
    });
  }
} else {
  console.log("owners_body_type", typeof owners.body);
  if (owners.body && typeof owners.body === "object") {
    console.log("owners_keys", Object.keys(owners.body));
  }
}

const ownerIds = [];
if (Array.isArray(owners.body)) {
  for (const row of owners.body) {
    const id = (row.owner ?? row).id;
    if (id) ownerIds.push(id);
  }
}
if (process.env.RENDER_OWNER_ID) ownerIds.push(process.env.RENDER_OWNER_ID);
ownerIds.push("tea-dagvca942hec73e3luog");
ownerIds.push("tea-da7j3urm6pss73ftp830");

const unique = [...new Set(ownerIds)];
for (const id of unique) {
  const svc = await rnd(`/services?ownerId=${encodeURIComponent(id)}&limit=50`);
  const n = Array.isArray(svc.body) ? svc.body.length : -1;
  const names = Array.isArray(svc.body)
    ? svc.body.map((r) => (r.service ?? r).name)
    : typeof svc.body === "object" && svc.body
      ? Object.keys(svc.body)
      : [];
  console.log("services", { ownerId: id, status: svc.status, count: n, names });
}
