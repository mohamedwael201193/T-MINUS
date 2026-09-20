import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(root, ".env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

export const env = {
  root,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  directUrl: required("DIRECT_URL"),
  solanaRpc: required("SOLANA_RPC_URL"),
  programId: required("PROGRAM_ID"),
  jupiterApiBase: process.env.JUPITER_API_BASE ?? "https://api.jup.ag",
  jupiterLiteBase: process.env.JUPITER_LITE_API_BASE ?? "https://lite-api.jup.ag",
  jupiterApiKey: process.env.JUPITER_API_KEY ?? "",
  prestocksMetricsUrl:
    process.env.PRESTOCKS_METRICS_URL ?? "https://prestocks.com/api/metrics",
  spacexMint: required("SPACEX_MINT"),
  spcxxMint: required("SPCXX_MINT"),
  feedStaleMs: Number(process.env.FEED_STALE_MS ?? 300_000),
};
