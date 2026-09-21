import { writeFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const PROGRAM = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
const PAYER = "CpTxsgPjvaaPSaBKkijvB1h3hzgJmPiTsWNhuS7tRkgX";
const SPACEX = "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
const SPCXX = "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const RPC = "https://api.mainnet-beta.solana.com";
const SO = resolve("target/deploy/tminus.so");
const PROGRAMDATA_HEADER = 45;
const BUFFER_HEADER = 37;
const PROGRAM_ACCOUNT = 36;
const FEE_BUFFER_LAMPORTS = 20_000_000;

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

const soBytes = existsSync(SO) ? statSync(SO).size : 0;
const [programDataRent, bufferRent, programRent, payer, program, t22] = await Promise.all([
  rpc("getMinimumBalanceForRentExemption", [PROGRAMDATA_HEADER + soBytes]),
  rpc("getMinimumBalanceForRentExemption", [BUFFER_HEADER + soBytes]),
  rpc("getMinimumBalanceForRentExemption", [PROGRAM_ACCOUNT]),
  rpc("getBalance", [PAYER]),
  rpc("getAccountInfo", [PROGRAM, { encoding: "base64" }]),
  rpc("getTokenAccountsByOwner", [PAYER, { programId: TOKEN_2022 }, { encoding: "jsonParsed" }]),
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
const peak = bufferRent + programDataRent + programRent;
const need = peak + FEE_BUFFER_LAMPORTS;
const locked = programDataRent + programRent;
const canDeploy = have >= need && !program?.value;
const out = {
  label: "MAINNET_DEPLOY_PREFLIGHT",
  at: new Date().toISOString(),
  payer: PAYER,
  programId: PROGRAM,
  soBytes,
  rent: {
    programDataLamports: programDataRent,
    bufferLamports: bufferRent,
    programLamports: programRent,
    peakDuringDeployLamports: peak,
    lockedAfterDeployLamports: locked,
    feeBufferLamports: FEE_BUFFER_LAMPORTS,
    refuseBelowLamports: need,
    refuseBelowSol: need / 1_000_000_000,
    lockedAfterDeploySol: locked / 1_000_000_000,
    peakDuringDeploySol: peak / 1_000_000_000,
  },
  have: { lamports: have, sol: have / 1_000_000_000 },
  tokens,
  spacex: tokens.find((t) => t.mint === SPACEX) ?? null,
  spcxx: tokens.find((t) => t.mint === SPCXX) ?? null,
  shortfallLamports: Math.max(0, need - have),
  shortfallSol: Math.max(0, need - have) / 1_000_000_000,
  programExists: Boolean(program?.value),
  programExecutable: Boolean(program?.value?.executable),
  canDeploy,
  refusedReason: canDeploy
    ? null
    : have < need
      ? `INSUFFICIENT_MAINNET_SOL have=${have} need=${need}. Upgradeable deploy peak is buffer+programdata+program (${peak} lamports) plus ${FEE_BUFFER_LAMPORTS} fee buffer.`
      : "PROGRAM_ALREADY_EXISTS",
};

writeFileSync(resolve("evidence/mainnet-deploy-preflight.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(canDeploy ? 0 : 2);
