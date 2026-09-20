import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, PublicKey } from "@solana/web3.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

async function main() {
  const mint = process.env.SPACEX_MINT ?? "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh";
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const epoch = await connection.getEpochInfo();
  const acc = await connection.getParsedAccountInfo(new PublicKey(mint));
  if (!acc.value || !("parsed" in acc.value.data)) {
    throw new Error("mint_unparsed");
  }
  const parsed = acc.value.data.parsed as {
    info: {
      decimals: number;
      mintAuthority: string | null;
      freezeAuthority: string | null;
      extensions?: { extension: string; state: unknown }[];
    };
  };
  const evidence = {
    label: "MAINNET",
    mint,
    owner: acc.value.owner.toBase58(),
    decimals: parsed.info.decimals,
    mintAuthority: parsed.info.mintAuthority,
    freezeAuthority: parsed.info.freezeAuthority,
    extensions: parsed.info.extensions ?? [],
    epoch: epoch.epoch,
    slot: epoch.absoluteSlot,
    fetchedAt: new Date().toISOString(),
  };
  mkdirSync(resolve(root, "evidence"), { recursive: true });
  writeFileSync(resolve(root, "evidence/mint-spacex.json"), JSON.stringify(evidence, null, 2));
  const fee = (parsed.info.extensions ?? []).find((e) => e.extension === "transferFeeConfig");
  const hook = (parsed.info.extensions ?? []).find((e) => e.extension === "transferHook");
  const pause = (parsed.info.extensions ?? []).find((e) => e.extension === "pausableConfig");
  const scaled = (parsed.info.extensions ?? []).find((e) => e.extension === "scaledUiAmountConfig");
  const perm = (parsed.info.extensions ?? []).find((e) => e.extension === "permanentDelegate");
  console.log(
    JSON.stringify({
      mint,
      epoch: epoch.epoch,
      fee,
      hook,
      pause,
      scaled,
      permanentDelegate: perm ?? null,
      tokenProgram: acc.value.owner.toBase58(),
    })
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
