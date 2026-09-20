import { writeFileSync } from "node:fs";

const PROGRAM = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
const DEPLOY = "FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj";
const KEEPER = "FbsV4KELsCki2ZujWfRPvu4kpWHDdr1bxAvGNhU13hPf";
const API = "https://tminus-api-k2d2.onrender.com";

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

async function accountMeta(url, pk) {
  const info = await rpc(url, "getAccountInfo", [pk, { encoding: "base64" }]);
  const bal = await rpc(url, "getBalance", [pk]);
  const value = info?.value;
  return {
    exists: Boolean(value),
    executable: Boolean(value?.executable),
    owner: value?.owner ?? null,
    lamports: value?.lamports ?? 0,
    sol: (bal?.value ?? 0) / 1_000_000_000,
    dataLen: Array.isArray(value?.data) ? Buffer.from(value.data[0], "base64").length : 0,
  };
}

const mainnet = "https://api.mainnet-beta.solana.com";
const devnet = "https://api.devnet.solana.com";

const probes = {};
for (const path of ["/health", "/ready", "/v1/keeper", "/v1/receipts"]) {
  try {
    const res = await fetch(API + path);
    probes[path] = { status: res.status, body: await res.json() };
  } catch (err) {
    probes[path] = { error: err instanceof Error ? err.message : "unknown" };
  }
}

const out = {
  label: "LIVE_STATUS",
  at: new Date().toISOString(),
  program: {
    id: PROGRAM,
    mainnet: await accountMeta(mainnet, PROGRAM),
    devnet: await accountMeta(devnet, PROGRAM),
  },
  deployWallet: {
    pubkey: DEPLOY,
    mainnetSol: (await accountMeta(mainnet, DEPLOY)).sol,
    devnetSol: (await accountMeta(devnet, DEPLOY)).sol,
  },
  keeperWallet: {
    pubkey: KEEPER,
    mainnetSol: (await accountMeta(mainnet, KEEPER)).sol,
    devnetSol: (await accountMeta(devnet, KEEPER)).sol,
  },
  render: probes,
};
writeFileSync("evidence/live-status.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
