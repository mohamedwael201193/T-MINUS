/**
 * Ingest confirmed DEVNET certification signatures into production receipts.
 * Never prints database URLs.
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { Connection } from "@solana/web3.js";
import { loadRenderDbUrls } from "./live-sql.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });
const PROGRAM = "HRLmVcuk6PRcVwB3UVpcbEC3LVVMhdLZfPvHtmL2PUdL";
const connection = new Connection(process.env.DEVNET_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");

type Row = {
  kind: "place" | "fill" | "cancel" | "expire";
  sig: string;
  failsafeFlag: boolean;
  orderPda?: string;
};

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(root, rel), "utf8")) as Record<string, unknown>;
}

function rows(): Row[] {
  const e2e = readJson("evidence/devnet-e2e.json");
  const sigs = (e2e.signatures ?? {}) as Record<string, string>;
  const keeper = readJson("evidence/devnet-keeper-fill.json");
  const ksigs = (keeper.signatures ?? {}) as Record<string, string>;
  const failsafe = readJson("evidence/devnet-failsafe-tick.json");
  const fsigs = (failsafe.signatures ?? {}) as Record<string, string>;
  const race = readJson("evidence/devnet-double-fill.json");
  const raceA = ((race.race as { a?: { sig?: string | null } } | undefined)?.a?.sig) ?? null;
  const seqFirst = ((race.sequential as { first?: { sig?: string | null } } | undefined)?.first?.sig) ?? null;
  const out: Row[] = [];
  if (sigs.place) out.push({ kind: "place", sig: sigs.place, failsafeFlag: false });
  if (sigs.cancel) out.push({ kind: "cancel", sig: sigs.cancel, failsafeFlag: false });
  if (sigs.fill) out.push({ kind: "fill", sig: sigs.fill, failsafeFlag: false });
  if (sigs.expire) out.push({ kind: "expire", sig: sigs.expire, failsafeFlag: false });
  if (ksigs.place) out.push({ kind: "place", sig: ksigs.place, failsafeFlag: false, orderPda: String(keeper.orderPda ?? "") });
  if (ksigs.fillPartial) out.push({ kind: "fill", sig: ksigs.fillPartial, failsafeFlag: false, orderPda: String(keeper.orderPda ?? "") });
  if (ksigs.fillClose) out.push({ kind: "fill", sig: ksigs.fillClose, failsafeFlag: false, orderPda: String(keeper.orderPda ?? "") });
  if (fsigs.keeperFill) {
    out.push({
      kind: "fill",
      sig: fsigs.keeperFill,
      failsafeFlag: true,
      orderPda: String(failsafe.failsafePda ?? ""),
    });
  }
  if (raceA) out.push({ kind: "fill", sig: raceA, failsafeFlag: false, orderPda: String((race.race as { pda?: string }).pda ?? "") });
  if (seqFirst) out.push({ kind: "fill", sig: seqFirst, failsafeFlag: false, orderPda: String((race.sequential as { pda?: string }).pda ?? "") });
  return out;
}

async function main() {
  const db = await loadRenderDbUrls();
  if (!db) throw new Error("missing_or_unusable_DIRECT_URL");
  const sql = postgres(db.directUrl, { prepare: false, max: 1 });
  const inserted: { kind: string; sig: string; slot: number }[] = [];
  try {
    for (const row of rows()) {
      if (!row.sig || row.sig.length < 32) continue;
      const parsed = await connection.getTransaction(row.sig, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      if (!parsed || parsed.meta?.err) throw new Error(`tx_missing_or_failed_${row.kind}_${row.sig.slice(0, 8)}`);
      const orderPda = row.orderPda && row.orderPda.length > 20 ? row.orderPda : PROGRAM;
      const payload = {
        orderPda,
        sig: row.sig,
        slot: parsed.slot,
        failsafeFlag: row.failsafeFlag,
        timestamp: new Date((parsed.blockTime ?? 0) * 1000).toISOString(),
        network: "DEVNET",
        kind: row.kind,
        explorer: `https://explorer.solana.com/tx/${row.sig}?cluster=devnet`,
        programId: PROGRAM,
      };
      await sql`
        insert into receipts (order_pda, sig, slot, payload)
        values (${orderPda}, ${row.sig}, ${parsed.slot}, ${sql.json(payload as never)})
        on conflict (sig) do update set payload = excluded.payload, slot = excluded.slot
      `;
      inserted.push({ kind: row.kind, sig: row.sig, slot: parsed.slot });
    }
    const count = await sql<{ n: number }[]>`select count(*)::int as n from receipts`;
    const out = { inserted: inserted.length, receiptRows: count[0]?.n ?? 0, kinds: inserted.map((r) => r.kind) };
    writeFileSync(resolve(root, "evidence/devnet-cert-receipts.json"), JSON.stringify({ ...out, inserted }, null, 2));
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
