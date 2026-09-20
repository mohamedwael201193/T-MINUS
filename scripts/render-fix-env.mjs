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

const KEEPER = "srv-dao6pop42hec738m1fkg";
const API = "srv-dao6qhp42hec738m40eg";

for (const id of [API, KEEPER]) {
  const ev = await rnd("GET", `/services/${id}/env-vars`);
  const rows = Array.isArray(ev.body) ? ev.body : [];
  console.log(
    "env_meta",
    id,
    rows.map((r) => {
      const e = r.envVar ?? r;
      return {
        key: e.key,
        hasValue: Boolean(e.value),
        valueLen: typeof e.value === "string" ? e.value.length : 0,
      };
    })
  );
}

const keeperEv = await rnd("GET", `/services/${KEEPER}/env-vars`);
const rows = (Array.isArray(keeperEv.body) ? keeperEv.body : []).map(
  (r) => r.envVar ?? r
);
if (!rows.some((e) => e.key === "DATABASE_URL")) {
  const putOne = await rnd("PUT", `/services/${KEEPER}/env-vars/DATABASE_URL`, {
    value: process.env.DATABASE_URL,
  });
  console.log("put_database_url", putOne.status, putOne.body && typeof putOne.body === "object" ? Object.keys(putOne.body) : typeof putOne.body);
  if (putOne.status >= 400) {
    const post = await rnd("POST", `/services/${KEEPER}/env-vars`, {
      key: "DATABASE_URL",
      value: process.env.DATABASE_URL,
    });
    console.log("post_database_url", post.status);
  }
}

for (const [id, dep] of [
  [API, "dep-dao6qi942hec738m42h0"],
  [KEEPER, "dep-dao6pop42hec738m1h20"],
]) {
  const d = await rnd("GET", `/services/${id}/deploys/${dep}`);
  const body = d.body?.deploy ?? d.body;
  console.log("deploy_detail", {
    service: id,
    status: d.status,
    deployStatus: body.status,
    commit: body.commit?.id,
    createdAt: body.createdAt,
    finishedAt: body.finishedAt,
    message: body.message,
    trigger: body.trigger,
  });
}
