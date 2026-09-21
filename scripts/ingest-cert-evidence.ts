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
  sourceAmount: string;
  destinationAmount: string;
  ratio: string | null;
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
  const e2eAmt = String((e2e.signatures as { escrowPostFee?: string } | undefined)?.escrowPostFee ?? "990000");
  const keeperAmt = String(keeper.escrowPostFeeRaw ?? "990000");
  const keeperRemain = String(keeper.remainingAfterFirst ?? "590000");
  const keeperFirst = (BigInt(keeperAmt) - BigInt(keeperRemain)).toString();
  const failsafeAmt = String(failsafe.ownerDestinationAfter ?? "990000");
  const raceRemain = String((race.race as { remaining?: string } | undefined)?.remaining ?? "990000");
  const out: Row[] = [];
  if (sigs.place) out.push({ kind: "place", sig: sigs.place, failsafeFlag: false, sourceAmount: e2eAmt, destinationAmount: "0", ratio: null });
  if (sigs.cancel) out.push({ kind: "cancel", sig: sigs.cancel, failsafeFlag: false, sourceAmount: e2eAmt, destinationAmount: "0", ratio: null });
  if (sigs.fill) out.push({ kind: "fill", sig: sigs.fill, failsafeFlag: false, sourceAmount: e2eAmt, destinationAmount: e2eAmt, ratio: "1000000000" });
  if (sigs.expire) out.push({ kind: "expire", sig: sigs.expire, failsafeFlag: false, sourceAmount: e2eAmt, destinationAmount: "0", ratio: null });
  if (ksigs.place) out.push({ kind: "place", sig: ksigs.place, failsafeFlag: false, orderPda: String(keeper.orderPda ?? ""), sourceAmount: keeperAmt, destinationAmount: "0", ratio: null });
  if (ksigs.fillPartial) out.push({ kind: "fill", sig: ksigs.fillPartial, failsafeFlag: false, orderPda: String(keeper.orderPda ?? ""), sourceAmount: keeperFirst, destinationAmount: keeperFirst, ratio: "1000000000" });
  if (ksigs.fillClose) out.push({ kind: "fill", sig: ksigs.fillClose, failsafeFlag: false, orderPda: String(keeper.orderPda ?? ""), sourceAmount: keeperRemain, destinationAmount: keeperRemain, ratio: "1000000000" });
  if (fsigs.keeperFill) {
    out.push({
      kind: "fill",
      sig: fsigs.keeperFill,
      failsafeFlag: true,
      orderPda: String(failsafe.failsafePda ?? ""),
      sourceAmount: failsafeAmt,
      destinationAmount: failsafeAmt,
      ratio: "1000000000",
    });
  }
  if (raceA) out.push({ kind: "fill", sig: raceA, failsafeFlag: false, orderPda: String((race.race as { pda?: string }).pda ?? ""), sourceAmount: raceRemain, destinationAmount: raceRemain, ratio: "1000000000" });
  if (seqFirst) out.push({ kind: "fill", sig: seqFirst, failsafeFlag: false, orderPda: String((race.sequential as { pda?: string }).pda ?? ""), sourceAmount: raceRemain, destinationAmount: raceRemain, ratio: "1000000000" });
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
        sourceAmount: row.sourceAmount,
        destinationAmount: row.destinationAmount,
        ratio: row.ratio,
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
