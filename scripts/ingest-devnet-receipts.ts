/**
 * Persist confirmed DEVNET e2e signatures into receipts.
 * Label: DEVNET. Does not invent sigs. Never prints DB URLs.
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { Connection, PublicKey } from "@solana/web3.js";
import { loadRenderDbUrls } from "./live-sql.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

const PROGRAM = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
const evidence = JSON.parse(readFileSync(resolve(root, "evidence/devnet-e2e.json"), "utf8")) as {
  escrowPostFeeRaw?: string;
  signatures: Record<string, string>;
  explorer?: Record<string, string>;
};

const rpc = process.env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
const connection = new Connection(rpc, "confirmed");

const kinds = ["place", "cancel", "fill", "expire"] as const;

async function pause(ms = 900) {
  await new Promise((r) => setTimeout(r, ms));
}

function orderPdaFromParsed(
  kind: (typeof kinds)[number],
  parsed: {
    transaction: {
      message: {
        accountKeys: { pubkey: PublicKey }[];
        instructions: { programId: PublicKey; accounts?: PublicKey[] }[];
      };
    };
  }
): string {
  const orderIndex = { place: 1, cancel: 1, fill: 2, expire: 2 }[kind];
  const ixs = parsed.transaction.message.instructions;
  const ours = ixs.find((ix) => ix.programId.toBase58() === PROGRAM);
  if (ours?.accounts?.[orderIndex]) return ours.accounts[orderIndex].toBase58();
  const keys = parsed.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
  return keys[orderIndex] ?? keys[1] ?? keys[0];
}

async function main() {
  const db = await loadRenderDbUrls();
  if (!db) throw new Error("missing_or_unusable_DIRECT_URL");
  const sql = postgres(db.directUrl, { prepare: false, max: 1 });
  try {
  const inserted: { kind: string; sig: string; slot: number; orderPda: string }[] = [];
  for (const kind of kinds) {
    const sig = evidence.signatures[kind];
    if (!sig || sig.length < 32) continue;
    await pause();
    const parsed = await connection.getParsedTransaction(sig, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!parsed) throw new Error(`tx_missing_${kind}`);
    const orderPda = orderPdaFromParsed(kind, parsed);
    const payload = {
      orderPda,
      sig,
      slot: parsed.slot,
      sourceAmount: evidence.escrowPostFeeRaw ?? "990000",
      destinationAmount: kind === "fill" ? evidence.escrowPostFeeRaw ?? "990000" : "0",
      ratio: kind === "fill" ? "1000000000" : null,
      failsafeFlag: false,
      route: null,
      feedHash: null,
      timestamp: new Date((parsed.blockTime ?? 0) * 1000).toISOString(),
      network: "DEVNET" as const,
      kind,
      explorer: evidence.explorer?.[kind] ?? `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
      programId: PROGRAM,
    };
    await sql`
      insert into receipts (order_pda, sig, slot, payload)
      values (${orderPda}, ${sig}, ${parsed.slot}, ${sql.json(payload as never)})
      on conflict (sig) do update set
        order_pda = excluded.order_pda,
        slot = excluded.slot,
        payload = excluded.payload
    `;
    inserted.push({ kind, sig, slot: parsed.slot, orderPda });
  }
  const count = await sql<{ n: number }[]>`select count(*)::int as n from receipts`;
  const out = { inserted, receiptRows: count[0]?.n ?? 0 };
  writeFileSync(resolve(root, "evidence/devnet-receipts.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
