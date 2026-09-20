import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair } from "@solana/web3.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(root, ".env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

export function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export const env = {
  root,
  databaseUrl: required("DATABASE_URL"),
  directUrl: required("DIRECT_URL"),
  solanaRpc: required("SOLANA_RPC_URL"),
  solanaNetwork: process.env.SOLANA_NETWORK ?? "mainnet-beta",
  programId: required("PROGRAM_ID"),
  jupiterApiBase: process.env.JUPITER_API_BASE ?? "https://api.jup.ag",
  jupiterLiteBase: process.env.JUPITER_LITE_API_BASE ?? "https://lite-api.jup.ag",
  jupiterApiKey: process.env.JUPITER_API_KEY ?? "",
  prestocksMetricsUrl:
    process.env.PRESTOCKS_METRICS_URL ?? "https://prestocks.com/api/metrics",
  spacexMint: required("SPACEX_MINT"),
  spcxxMint: required("SPCXX_MINT"),
  feedStaleMs: Number(process.env.FEED_STALE_MS ?? 300_000),
  pollMs: Number(process.env.KEEPER_POLL_MS ?? 5000),
  spendCapRaw: BigInt(required("KEEPER_SPEND_CAP_RAW")),
  sendEnabled: process.env.KEEPER_SEND_ENABLED === "true",
  keypairPath: required("KEEPER_KEYPAIR_PATH"),
  workerId: process.env.KEEPER_WORKER_ID ?? "tminus-keeper-1",
};

export const keeperKeypair = loadKeypair(env.keypairPath);
