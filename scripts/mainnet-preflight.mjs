import { writeFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const PROGRAM = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
const PAYER = "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX";
const SPACEX = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const SPCXX = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const RPC = "https://api.mainnet-beta.solana.com";
const SO = resolve("target/deploy/tminus.so");
const LAMPORTS_PER_BYTE_YEAR = 3480;
const EXEMPTION_YEARS = 2;
const ACCOUNT_OVERHEAD = 128;
const PROGRAMDATA_HEADER = 45;
const NEED_LAMPORTS = 1_900_000_000;

function rentExempt(dataLen) {
  return (dataLen + ACCOUNT_OVERHEAD) * LAMPORTS_PER_BYTE_YEAR * EXEMPTION_YEARS;
}

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

const soBytes = existsSync(SO) ? statSync(SO).size : 254768;
const programDataRent = rentExempt(PROGRAMDATA_HEADER + soBytes);
const programRent = rentExempt(36);
const totalLocked = programDataRent + programRent;
const payer = await rpc("getBalance", [PAYER]);
const program = await rpc("getAccountInfo", [PROGRAM, { encoding: "base64" }]);
const t22 = await rpc("getTokenAccountsByOwner", [
  PAYER,
  { programId: TOKEN_2022 },
  { encoding: "jsonParsed" },
]);
const tokens = [];
for (const a of t22?.value ?? []) {
  const info = a.account.data.parsed.info;
  if (info.tokenAmount.amount === "0") continue;
  tokens.push({
    mint: info.mint,
    amountRaw: info.tokenAmount.amount,
    ui: info.tokenAmount.uiAmountString,
  });
}
const have = payer.value ?? 0;
const canDeploy = have >= NEED_LAMPORTS && !program?.value;
const out = {
  label: "MAINNET_DEPLOY_PREFLIGHT",
  at: new Date().toISOString(),
  payer: PAYER,
  programId: PROGRAM,
  soBytes,
  rent: {
    programDataLamports: programDataRent,
    programLamports: programRent,
    totalLockedLamports: totalLocked,
    totalLockedSol: totalLocked / 1_000_000_000,
    refuseBelowLamports: NEED_LAMPORTS,
    refuseBelowSol: NEED_LAMPORTS / 1_000_000_000,
  },
  have: { lamports: have, sol: have / 1_000_000_000 },
  tokens,
  spacex: tokens.find((t) => t.mint === SPACEX) ?? null,
  spcxx: tokens.find((t) => t.mint === SPCXX) ?? null,
  shortfallLamports: Math.max(0, NEED_LAMPORTS - have),
  shortfallSol: Math.max(0, NEED_LAMPORTS - have) / 1_000_000_000,
  programExists: Boolean(program?.value),
  programExecutable: Boolean(program?.value?.executable),
  canDeploy,
  refusedReason: canDeploy
    ? null
    : have < NEED_LAMPORTS
      ? `INSUFFICIENT_MAINNET_SOL have=${have} need=${NEED_LAMPORTS}. A ${soBytes}-byte upgradeable program locks ~${(totalLocked / 1_000_000_000).toFixed(3)} SOL of rent. Do not start a buffer upload that would fail mid-way.`
      : "PROGRAM_ALREADY_EXISTS",
};

writeFileSync(resolve("evidence/mainnet-deploy-preflight.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(canDeploy ? 0 : 2);
