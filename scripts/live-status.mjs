import { writeFileSync } from "node:fs";

const PROGRAM = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
const DEPLOY = "FrwqWhgEhbSnvKXzsG74qkB4ZsRiiheay7LcWBNd5DTj";
const KEEPER = "FbsV4KELsCki2ZujWfRPvu4kpWHDdr1bxAvGNhU13hPf";
const USER_FUND = "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX";
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

const SPACEX = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const SPCXX = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

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

async function tokenHoldings(url, owner) {
  const [spl, t22] = await Promise.all([
    rpc(url, "getTokenAccountsByOwner", [owner, { programId: TOKEN }, { encoding: "jsonParsed" }]),
    rpc(url, "getTokenAccountsByOwner", [owner, { programId: TOKEN_2022 }, { encoding: "jsonParsed" }]),
  ]);
  const tokens = [];
  for (const group of [spl, t22]) {
    for (const a of group?.value ?? []) {
      const info = a.account.data.parsed.info;
      const amount = info.tokenAmount.amount;
      if (amount === "0") continue;
      tokens.push({
        mint: info.mint,
        amount,
        ui: info.tokenAmount.uiAmountString,
        program: a.account.owner,
      });
    }
  }
  return {
    nonZeroCount: tokens.length,
    spacex: tokens.find((t) => t.mint === SPACEX) ?? null,
    spcxx: tokens.find((t) => t.mint === SPCXX) ?? null,
    tokens,
  };
}

const mainnet = "https://api.mainnet-beta.solana.com";
const devnet = "https://api.devnet.solana.com";

const probes = {};
for (const path of ["/health", "/ready", "/v1/keeper", "/v1/receipts", "/v1/program"]) {
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
  userFundWallet: {
    pubkey: USER_FUND,
    mainnetSol: (await accountMeta(mainnet, USER_FUND)).sol,
    devnetSol: (await accountMeta(devnet, USER_FUND)).sol,
    mainnetTokens: await tokenHoldings(mainnet, USER_FUND),
    devnetTokens: await tokenHoldings(devnet, USER_FUND),
  },
  render: probes,
};
writeFileSync("evidence/live-status.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
