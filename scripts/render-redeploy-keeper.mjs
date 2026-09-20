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
const KEEPER = "srv-dao6pop42hec738m1fkg";

const res = await fetch(`https://api.render.com/v1/services/${KEEPER}/deploys`, {
  method: "POST",
  headers: {
    accept: "application/json",
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ clearCache: "do_not_clear" }),
});
const body = await res.json();
const dep = body.deploy ?? body;
console.log({
  status: res.status,
  deployId: dep.id,
  deployStatus: dep.status,
  createdAt: dep.createdAt,
});
