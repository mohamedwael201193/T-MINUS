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
if (!key) {
  console.error("RENDER_API_KEY missing");
  process.exit(1);
}

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

const owners = await rnd("GET", "/owners?limit=50");
console.log("owners_status", owners.status);
const ownerList = Array.isArray(owners.body) ? owners.body : [];
for (const row of ownerList) {
  const o = row.owner ?? row;
  console.log("owner", { id: o.id, name: o.name, type: o.type });
}

const ownerId = (ownerList[0]?.owner ?? ownerList[0])?.id;
if (!ownerId) {
  console.error("no_owner");
  process.exit(1);
}

const listed = await rnd("GET", `/services?ownerId=${encodeURIComponent(ownerId)}&limit=50`);
const existing = Array.isArray(listed.body)
  ? listed.body.map((r) => r.service ?? r)
  : [];
console.log(
  "existing",
  existing.map((s) => ({ id: s.id, name: s.name, type: s.type, plan: s.serviceDetails?.plan }))
);

const PROGRAM_ID =
  process.env.PROGRAM_ID || "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
const keeperPath =
  process.env.KEEPER_KEYPAIR_PATH ||
  resolve(process.env.USERPROFILE || "", ".tminus/keys/keeper.json");
if (!existsSync(keeperPath)) {
  console.error("keeper keypair file missing");
  process.exit(1);
}
const keeperJson = readFileSync(keeperPath, "utf8").trim();
JSON.parse(keeperJson);

function envVar(k, v) {
  return { key: k, value: v };
}

const pairs = {
  NODE_VERSION: "22",
  PORT: "10000",
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  SOLANA_NETWORK: process.env.SOLANA_NETWORK || "mainnet-beta",
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
  SOLANA_WS_URL: process.env.SOLANA_WS_URL || "",
  PROGRAM_ID,
  JUPITER_API_BASE: process.env.JUPITER_API_BASE || "https://api.jup.ag",
  JUPITER_LITE_API_BASE: process.env.JUPITER_LITE_API_BASE || "https://lite-api.jup.ag",
  JUPITER_API_KEY: process.env.JUPITER_API_KEY || "",
  PRESTOCKS_METRICS_URL:
    process.env.PRESTOCKS_METRICS_URL || "https://prestocks.com/api/metrics",
  SPACEX_MINT: process.env.SPACEX_MINT || "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
  SPCXX_MINT: process.env.SPCXX_MINT || "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
  TOKEN_2022_PROGRAM:
    process.env.TOKEN_2022_PROGRAM || "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  KEEPER_POLL_MS: process.env.KEEPER_POLL_MS || "5000",
  KEEPER_MAX_IN_FLIGHT: process.env.KEEPER_MAX_IN_FLIGHT || "1",
  KEEPER_SPEND_CAP_RAW: process.env.KEEPER_SPEND_CAP_RAW || "200000000",
  KEEPER_SEND_ENABLED: "false",
  KEEPER_EMBEDDED: "true",
  FEED_STALE_MS: process.env.FEED_STALE_MS || "300000",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  KEEPER_WORKER_ID: "tminus-keeper-1",
  KEEPER_KEYPAIR_JSON: keeperJson,
};

const envVars = Object.entries(pairs)
  .filter(([, v]) => v !== undefined && v !== "")
  .map(([k, v]) => envVar(k, v));

const byName = Object.fromEntries(existing.map((s) => [s.name, s]));
let api = byName["tminus-api"];
if (!api) {
  const created = await rnd("POST", "/services", {
    type: "web_service",
    name: "tminus-api",
    ownerId,
    repo: "https://github.com/mohamedwael201193/T-MINUS",
    branch: "main",
    autoDeploy: "yes",
    envVars,
    serviceDetails: {
      runtime: "node",
      plan: "free",
      region: "oregon",
      healthCheckPath: "/health",
      preDeployCommand: "pnpm --filter @tminus/api migrate",
      envSpecificDetails: {
        buildCommand:
          "npm install -g pnpm@10.34.5 && pnpm install --frozen-lockfile --prod=false && pnpm --filter @tminus/api typecheck && pnpm --filter @tminus/keeper typecheck",
        startCommand: "pnpm --filter @tminus/api start",
      },
    },
  });
  console.log("create_status", created.status);
  if (created.status !== 201 && created.status !== 200) {
    const err = created.body;
    console.log("create_error", {
      message: err?.message,
      name: err?.name,
      keys: err && typeof err === "object" ? Object.keys(err) : [],
    });
    process.exit(1);
  }
  api = created.body.service ?? created.body;
}

const d = api.serviceDetails ?? {};
const out = {
  ownerId,
  api: {
    id: api.id,
    name: api.name,
    type: api.type,
    slug: api.slug,
    dashboardUrl: api.dashboardUrl,
    url: d.url,
    plan: d.plan,
    runtime: d.runtime,
  },
  keeper: "embedded_in_api_free_tier",
  label: "FREE",
};
writeFileSync(resolve(process.cwd(), "evidence/render-services.json"), JSON.stringify(out, null, 2));
console.log("deployed", out);
