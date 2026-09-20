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

const OWNER = "tea-da7j3urm6pss73ftp830";
const REPO = "https://github.com/mohamedwael201193/T-MINUS";
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

function appEnvVars(extra = []) {
  const pairs = {
    NODE_VERSION: "22",
    PORT: "3000",
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SOLANA_NETWORK: process.env.SOLANA_NETWORK || "mainnet-beta",
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    SOLANA_WS_URL: process.env.SOLANA_WS_URL || "",
    PROGRAM_ID,
    JUPITER_API_BASE: process.env.JUPITER_API_BASE || "https://api.jup.ag",
    JUPITER_LITE_API_BASE:
      process.env.JUPITER_LITE_API_BASE || "https://lite-api.jup.ag",
    JUPITER_API_KEY: process.env.JUPITER_API_KEY || "",
    PRESTOCKS_METRICS_URL:
      process.env.PRESTOCKS_METRICS_URL || "https://prestocks.com/api/metrics",
    SPACEX_MINT:
      process.env.SPACEX_MINT || "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    SPCXX_MINT:
      process.env.SPCXX_MINT || "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8",
    TOKEN_2022_PROGRAM:
      process.env.TOKEN_2022_PROGRAM ||
      "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    KEEPER_POLL_MS: process.env.KEEPER_POLL_MS || "5000",
    KEEPER_MAX_IN_FLIGHT: process.env.KEEPER_MAX_IN_FLIGHT || "1",
    KEEPER_SPEND_CAP_RAW: process.env.KEEPER_SPEND_CAP_RAW || "200000000",
    KEEPER_SEND_ENABLED: "false",
    FEED_STALE_MS: process.env.FEED_STALE_MS || "300000",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    KEEPER_WORKER_ID: "tminus-keeper-1",
  };
  const out = [];
  for (const [k, v] of Object.entries(pairs)) {
    if (v === undefined || v === "") continue;
    out.push(envVar(k, v));
  }
  out.push(...extra);
  return out;
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

function summarizeService(s) {
  const d = s.serviceDetails ?? {};
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    slug: s.slug,
    dashboardUrl: s.dashboardUrl,
    url: d.url,
    plan: d.plan,
    runtime: d.runtime,
  };
}

const listed = await rnd(
  "GET",
  `/services?ownerId=${OWNER}&limit=50`
);
if (listed.status !== 200) {
  console.error("list_fail", listed.status);
  process.exit(1);
}
const existing = (listed.body || []).map((row) => row.service ?? row);
const byName = Object.fromEntries(existing.map((s) => [s.name, s]));

const apiBuild =
  "npm install -g pnpm@10.34.5 && pnpm install --frozen-lockfile --prod=false && pnpm --filter @tminus/api typecheck";
const keeperBuild =
  "npm install -g pnpm@10.34.5 && pnpm install --frozen-lockfile --prod=false && pnpm --filter @tminus/keeper typecheck";

async function createOrReuse(name, type, details, extraEnv) {
  if (byName[name]) {
    console.log("exists", summarizeService(byName[name]));
    return byName[name];
  }
  const payload = {
    type,
    name,
    ownerId: OWNER,
    repo: REPO,
    branch: "main",
    autoDeploy: "yes",
    envVars: appEnvVars(extraEnv),
    serviceDetails: details,
  };
  const created = await rnd("POST", "/services", payload);
  console.log("create", name, created.status);
  if (created.status !== 201 && created.status !== 200) {
    const err = created.body;
    console.log("create_error", {
      message: err?.message,
      name: err?.name,
      code: err?.code,
      keys: err && typeof err === "object" ? Object.keys(err) : [],
    });
    if (err && typeof err === "object" && err.errors) {
      console.log("create_errors", err.errors);
    }
    return null;
  }
  const svc = created.body.service ?? created.body;
  console.log("created", summarizeService(svc));
  return svc;
}

const api = await createOrReuse(
  "tminus-api",
  "web_service",
  {
    runtime: "node",
    plan: "free",
    region: "oregon",
    healthCheckPath: "/health",
    preDeployCommand: "pnpm --filter @tminus/api migrate",
    envSpecificDetails: {
      buildCommand: apiBuild,
      startCommand: "pnpm --filter @tminus/api start",
    },
  },
  []
);

const keeper = await createOrReuse(
  "tminus-keeper",
  "background_worker",
  {
    runtime: "node",
    plan: "starter",
    region: "oregon",
    envSpecificDetails: {
      buildCommand: keeperBuild,
      startCommand: "pnpm --filter @tminus/keeper start",
    },
  },
  [envVar("KEEPER_KEYPAIR_JSON", keeperJson)]
);

const out = {
  api: api ? summarizeService(api) : null,
  keeper: keeper ? summarizeService(keeper) : null,
};
writeFileSync(
  resolve(process.cwd(), "evidence/render-services.json"),
  JSON.stringify(out, null, 2)
);
console.log("wrote evidence/render-services.json");
