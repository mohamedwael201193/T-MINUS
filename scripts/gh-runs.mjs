import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path) {
  if (!existsSync(path)) return;
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
const tok = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const res = await fetch(
  "https://api.github.com/repos/mohamedwael201193/T-MINUS/actions/runs?per_page=6",
  {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "tminus-agent",
      ...(tok ? { authorization: `Bearer ${tok}` } : {}),
    },
  }
);
const j = await res.json();
if (!Array.isArray(j.workflow_runs)) {
  console.log(JSON.stringify({ status: res.status, message: j.message || "no_runs" }));
  process.exit(res.ok ? 0 : 1);
}
console.log(
  JSON.stringify(
    j.workflow_runs.map((r) => ({
      sha: r.head_sha.slice(0, 8),
      status: r.status,
      conclusion: r.conclusion,
      name: r.name,
      at: r.updated_at,
    })),
    null,
    2
  )
);
